import {Filters, FiltersFields} from "../interfaces";

export class MiscUtils {
    private static filterByNumberValue(results: any[], cb: (results: any[]) => void, filterValue?: number[], attrPath?: string) {
        // out condition (no results or the results are an empty array or if we have no filter value passed we simple move on)
        // this will be basically the same for the rest of the filters.

        if (!results || !results.length || !filterValue || !attrPath) {
            cb(results);
            return;
        }
        const min: number = +filterValue[0];
        const max: number = +filterValue[1];

        cb(results.filter(value => {
            const CURRENT_VALUE = value[attrPath];
            return CURRENT_VALUE >= min && CURRENT_VALUE <= max;
        }));
    }

    private static filterByCertificate(results: any[], cb: (results: any[]) => void, certificate?: boolean[]) {
        if (!results || !results.length || certificate === null || certificate === undefined) {
            cb(results);
            return;
        }

        cb(results.filter(value => {
            return value[FiltersFields.Certificate.toString()] === certificate[0] || value[FiltersFields.Certificate.toString()] === certificate[1];
        }));
    }

    public static filterResults(results: any[], filter: Filters, cb: (results: any[]) => void) {
        MiscUtils.filterByNumberValue(results, results1 => {
            MiscUtils.filterByCertificate(results1, results2 => {
                MiscUtils.filterByNumberValue(results2, results3 => {
                    MiscUtils.filterByNumberValue(results3, results4 => {
                        MiscUtils.filterByNumberValue(results4, results5 => {
                            cb(results5);
                        }, filter.ageId, FiltersFields.ageId.toString())
                    }, filter.sessionLevelId, FiltersFields.sessionLevelId.toString())
                }, filter.courseFormatId, FiltersFields.courseFormatId.toString())
            }, filter.Certificate)
        }, filter.cost, FiltersFields.cost.toString());
    }

    public countSubstring(mainString: string, keyword: string): number {
        return (mainString.match(new RegExp(keyword, 'g')) || []).length;
    }
}
