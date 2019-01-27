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