## 2024-06-25 - N+1 optimization in getTeamSchedule
**Learning:** Found an N+1 query in `ScheduleService.getTeamSchedule` where `getCalendar` was called in a `Promise.all` loop for every employee. Each `getCalendar` did 5 separate DB queries (exceptions, holidays, timeTracks, userSchedules, employee).
**Action:** Extract all queries before the loop to do one bulk DB call each using the `{ in: [...] }` operator, group by employeeId using an in-memory Map, and refactor calendar build logic into `buildCalendarDays`.
