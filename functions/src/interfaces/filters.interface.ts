export interface Filters {
    ageId?: number[];
    courseFormatId?: number[];
    sessionLevelId?: number[];
    Certificate?: boolean[];
    cost?: number[];
}

export enum FiltersFields {
    ageId = 'ageId',
    courseFormatId = 'courseFormatId',
    sessionLevelId = 'sessionLevelId',
    Certificate = 'Certificate',
    cost = 'cost'
}
