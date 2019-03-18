const MIN_YEAR = 2018
const MAX_YEAR = 2019

exports.codeDay = (date) => {
    return date.year + '-' + date.month + '-' + date.day
}

const __is_leap_year = year => {
    if (year % 400 === 0)
        return true
    if (year % 100 === 0)
        return false
    if (year % 4 === 0)
        return true
    return false
}

exports.__is_before = (first, second) => {
    if (first.year < second.year)
        return true
    if (first.year > second.year)
        return false
    if (first.month < second.month)
        return true
    if (first.month > second.month)
        return false
    if (first.day >= second.day)
        return false
    return true
}

exports.__is_to_day_equal = (first, second) => {
    return first.year === second.year && first.month === second.month && first.day === second.day
}

const __days_in_month = {
    1: 31,  // Jan
    2: 28,  // Feb
    3: 31,  // Mar
    4: 30,  // Apr
    5: 31,  // May
    6: 30,  // Jun
    7: 31,  // Jul
    8: 31,  // Aug
    9: 30,  // Sep
    10: 31, // Oct
    11: 30, // Nov
    12: 31 // Dec
}


/**
 * 
 * @param {Number} year 
 * @param {Number} month
 * Returns amount of days in this month at this year 
 */
const getDaysInMonth = (year, month) => {
    if (month == 2)
        return __days_in_month[month] + __is_leap_year(year)
    return __days_in_month[month]
}

exports.getDaysInMonth = getDaysInMonth

exports.__get_prev_day = from => {
    let current = Object.assign({}, from)
    if (current.day === 1) {
        if (current.month === 3) {
            if (__is_leap_year(current.year)) {
                current.month -= 1
                current.day = 29
            } else {
                current.month -= 1
                current.day = 28
            }
        } else if (current.month === 1) {
            current.month = 12
            current.day = 31
            current.year -= 1
        } else {
            current.month -= 1
            current.day = __days_in_month[current.month]
        }
        return current
    } else {
        current.day -= 1
        return current
    }
}

exports.validateRecord = (record) => {
    if (record === undefined) return 'record is undefined'
    if (record.name === undefined || record.name.length == 0) return 'record name is undefined or empty'
    if (record.login === undefined || record.login.length == 0) return 'record owner login is undefined or empty'
    
    if (record.tags === undefined || typeof(record.tags) != 'object' || typeof(record.tags.length) != 'number')
        return 'record tags is empty or it is not an array'
    if (record.tags[0] == undefined)
        return 'record tag shouldn\'t be null'
    else if (record.tags.length > 1) return 'record tags array must have only one element'
    else if (record.tags.length == 0) return 'record tags array must have at least one element'

    if (record.wallet === undefined || record.wallet.length == 0) return 'record wallet is undefined or empty'
    if (record.wallet === undefined || record.wallet.length == 0) return 'record wallet is undefined or empty'
    if (record.value === undefined || !(typeof(record.value) == typeof(0))) return 'record value is empty or is not in int type'
    if (record.daily === undefined || typeof(record.daily) != 'boolean') return 'record daily is empty or doesn\'t have boolean type'
    
    if (record.date === undefined || typeof(record.date) !== 'object')
        return 'record date is not an object or undefined'
    if (typeof(record.date.year) !== 'number') return 'record date year is not of type number'
    if (typeof(record.date.month) !== 'number') return 'record date month is not of type number'
    if (typeof(record.date.day) !== 'number') return 'record date day is not of type number'
    if (typeof(record.date.hour) !== 'number') return 'record date hour is not of type number'
    if (typeof(record.date.minute) !== 'number') return 'record date minute is not of type number'

    /* Date checking */

    const { date } = record

    if (date.year > MAX_YEAR || date.year < MIN_YEAR)
        return `you can\'t set year less than ${MIN_YEAR} or more than ${MAX_YEAR}`
    if (date.month <= 0 || date.month >= 13) return `in my universe there is no month with number ${date.month}`
    if (date.hour > 23 || date.hour < 0) return 'you cannot set hour less than 0 and more than 23'
    if (date.minute > 59 || date.minute < 0) return 'you cannot set minute less than 0 and more than 59'
    let maxDaysInThisMonth = getDaysInMonth(date.year, date.month)
    if (date.day <= 0 || date.day > maxDaysInThisMonth) return `you cannot set day less than 1 and more than ${maxDaysInThisMonth}`

    return null
}

exports.validateTemplate = (template) => {
    if (template === undefined) return 'template is undefined'
    if (template.name === undefined || template.name.length == 0) return 'template name is undefined or empty'
    
    if (template.tags === undefined || typeof(template.tags) != 'object' || typeof(template.tags.length) != 'number')
        return 'template tags is empty ot it is not an array'
    if (template.tags[0] == undefined)
        return 'record tag shouldn\'t be null'
    else if (template.tags.length > 1) return 'template tags array must have only one element'
    else if (template.tags.length == 0) return 'template tags array must have at least one element'

    if (template.wallet === undefined || template.wallet.length == 0) return 'template wallet is undefined or empty'
    if (template.wallet === undefined || template.wallet.length == 0) return 'template wallet is undefined or empty'
    if (template.value === undefined || !(typeof(template.value) == typeof(0))) return 'template value is empty or is not in int type'

    return null
}
