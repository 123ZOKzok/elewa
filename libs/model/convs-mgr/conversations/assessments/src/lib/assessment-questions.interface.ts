
import { StoryBlock } from "@app/model/convs-mgr/stories/blocks/main";

export interface AssessmentQuestion extends StoryBlock 
{ 
    questionType: AssessmentQuestionType, 
    marks: number, 
    feedback?: string, 
    options?: AssessmentQuestionOptions[],
    nextQuestionId?: number,
    prevQuestionId?: number
}

export interface AssessmentQuestionOptions 
{ 
    id: string, 
    text: string, 
    value: AssessmentOptionValue
}

export enum AssessmentQuestionType {
    SingleSelectOptions = 1,
}

export enum AssessmentOptionValue {
    Correct = 1,
    Wrong = 2,
    FiftyFifty = 3
}