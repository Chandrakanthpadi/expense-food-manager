# IST Timezone Changes Progress

## Steps:
- [x] 1. Add IST util functions to src/lib/utils.ts
- [x] 2. Update src/hooks/useLifeData.ts (today() -> getISTDateStr())
- [x] 3. Update src/components/MiniCalendar.tsx (todayStr)
- [x] 4. Update src/components/HabitTracker.tsx (today)
- [x] 5. Update src/pages/Index.tsx (todayStr)
- [x] 6. Update src/components/SummaryStats.tsx (date funcs to IST)
- [x] 7. Update src/pages/Insights.tsx (fmtLocal, date range to IST)
- [ ] 8. Test changes (calendar, today, storage)

## Next:
Start with step 1: utils.
