import { Component, EventEmitter, Inject, OnDestroy, OnInit, Output, Input } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';

import { SubSink } from 'subsink';
import { Observable, of, switchMap, take, tap } from 'rxjs';

import { BotModulesStateService } from '@app/state/convs-mgr/modules';
import { BotsStateService } from '@app/state/convs-mgr/bots';

import { BotModule } from '@app/model/convs-mgr/bot-modules';
import { Bot, BotMutationEnum } from '@app/model/convs-mgr/bots';

import { CREATE_EMPTY_BOT_MODULE } from '../../providers/forms/bot-module-form.provider';

@Component({
  selector: 'italanta-apps-create-module-modal',
  templateUrl: './create-module-modal.component.html',
  styleUrls: ['./create-module-modal.component.scss'],
})
export class CreateModuleModalComponent implements OnInit, OnDestroy {
  private _sBs = new SubSink();

  selectedBot: Bot;

  @Input()
  set botFromStepper(value: Bot) {
    this.getBots(value); // this is called onInit with an undefined value so we don't add it to ngOnInit
  }

  @Output() nextStepEvent = new EventEmitter<BotModule>();

  moduleForm: FormGroup;

  botModule: BotModule;
  isCreateMode: boolean;
  isSavingModule: boolean;

  bots: Bot[];

  constructor(
    private _botModulesServ: BotModulesStateService,
    private _botsServ$: BotsStateService,
    private _formBuilder: FormBuilder,
    private _dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: { botMode: BotMutationEnum; botModule?: BotModule }
  ) {
    this.isCreateMode = data.botMode === BotMutationEnum.CreateMode;
    this.data.botModule ? this.botModule = this.data.botModule : ''
  }

  ngOnInit() {
    this.createFormGroup();

    if (!this.isCreateMode) {
      this.updateFormGroup();
    }
  }

  getBots(value?: Bot) {
    this._sBs.sink = this._botsServ$.getBots().subscribe((bots) => {
      this.bots = bots;

      if (value) {
        this.selectedBot = bots.find((bot) => bot.id === value.id) as Bot;
      }
    })
  }

  createFormGroup() {
    this.moduleForm = CREATE_EMPTY_BOT_MODULE(this._formBuilder);
  }

  updateFormGroup() {
    this.moduleForm.patchValue({
      id: this.botModule.id,
      moduleName: this.botModule.name,
      moduleDesc: this.botModule.description,
      parentBot: this.botModule.parentBot,
      stories: this.botModule.stories
    });
  }

  submitForm() {
    const botModule: BotModule = {
      id: this.moduleForm.value.id,
      name: this.moduleForm.value.moduleName,
      description: this.moduleForm.value.moduleDesc,
      stories: this.moduleForm.value.stories,
      parentBot : this.moduleForm.value.parentBot.id,
      type: 'BotModule'
    };

    if (this.isCreateMode) {
      this.saveModuleState(botModule, this.moduleForm.value.parentBot);
    } else {
      this.updateModuleState(botModule, this.moduleForm.value.parentBot);
    }
  }

  /** Save the module and add the module's id to parent Bot's module list */
  saveModuleState(botModule: BotModule, parentBot: string) {
    this.isSavingModule = true;
    let newModule:BotModule

    this._sBs.sink = this._botModulesServ.createBotModules(botModule)
      .pipe(
        take(1),
        switchMap((botMod) => {
          newModule = botMod //newly created Module 
          return this.updateNewParent(botMod, parentBot)
        }),
        tap(() => {
          this.isSavingModule = false
          this.nextStepEvent.emit(newModule);
        })
      )
      .subscribe();
  }

  /** update botModule */
  updateModuleState(botModule: BotModule, parentBotId: string) {
    this.isSavingModule = true;
    this._sBs.sink = this._botModulesServ.updateBotModules(botModule).pipe(
      take(1),
      switchMap((botMod) => {
        if (this.data.botModule?.parentBot !== parentBotId) {
          this.deleteFromOldParent(botMod, this.data.botModule?.parentBot as string)
        }

        return this.updateNewParent(botMod, parentBotId)
      })
    )
    .subscribe(() => {
      this.isSavingModule = false
      this._dialog.closeAll();
    });
  }

  /** delete botModule from old parentBot */
  deleteFromOldParent(botMod: BotModule, oldParentBotId: string) {
    this._sBs.sink = this._botsServ$.getBotById(oldParentBotId).pipe(
      take(1),
      switchMap((bot) => {
        if (bot) {
          bot.modules.filter((modId) => modId !== botMod.id)
          return this._botsServ$.updateBot(bot as Bot);
        }
        return of(null);
      })
    ).subscribe()
  }

  /** update new parent modules list */
  updateNewParent(botMod: BotModule, parentBotId: string) {
    return this._botsServ$.getBotById(parentBotId).pipe(
      take(1),
      switchMap((bot) => {
        if (bot) {
          bot.modules.push(botMod.id as string);
          return this._botsServ$.updateBot(bot as Bot);
        }

        return of(null); // Handle the case where bot is null (should never happen);
      })
    );
  }

  ngOnDestroy() {
    this._sBs.unsubscribe();
  }
}
