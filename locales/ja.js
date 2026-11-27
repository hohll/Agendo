/* Agendo — 日本語 (core and plugins).
 *
 *   <script src="agendo.js"></script>
 *   <script src="locales/ja.js"></script>
 *   new Agendo('#calendar', { locale: 'ja-JP' });
 *
 * Keys: see Agendo.locales.en in agendo.js. Dates, weekdays and months come from Intl.
 * Japanese has no plural forms: every text is a plain string.
 */
(function () {
  // "毎週月曜日", but "2週間ごとの月曜日": after "…ごと" (every N…) the rest takes の.
  const no = rule => (rule.endsWith('ごと') ? `${rule}の` : rule);

  Agendo.addLocale('ja', {
    // Toolbar
    today: '今日', previous: '前へ', next: '次へ',
    day: '日', workweek: '平日', week: '週', month: '月', year: '年',
    list: 'リスト', resources: 'リソース', timeline: 'タイムライン',
    timelineDays: '{n}日間',
    filter: 'フィルター', filterHidden: 'フィルター（{n}件非表示）', calendars: 'カレンダー', categories: 'カテゴリ',
    // Views
    allDayRow: '終日', allDayList: '終日', titleAllDay: '{title}（終日）',
    noEvents: '表示する予定はありません', more: '他{n}件',
    dayEvents: '{date}、予定{n}件',
    weekNumber: '第{n}週', weekShort: '{n}週', repeats: '繰り返し',
    // Popover and event form
    allDay: '終日', resource: 'リソース', calendar: 'カレンダー', category: 'カテゴリ', location: '場所',
    newEvent: '新しい予定', editEvent: '予定を編集', close: '閉じる',
    title: 'タイトル', start: '開始', end: '終了', repeat: '繰り返し',
    repeatEvery: '繰り返す間隔', interval: '間隔', unit: '単位',
    unitDays: '日', unitWeeks: '週', unitMonths: 'か月', unitYears: '年',
    onDays: '曜日', ends: '終了', endsNever: 'なし', endsOn: '終了日', endDate: '終了日',
    endsAfter: '回数', occurrences: '回', occurrenceCount: '回数',
    delete: '削除', cancel: 'キャンセル', save: '保存', ok: 'OK',
    // Repeat choices
    repeatNone: '繰り返さない', repeatDaily: '毎日', repeatWeekly: '毎週{weekday}',
    repeatWeekdays: '毎週平日（月曜日〜金曜日）', repeatMonthly: '毎月{day}日',
    repeatMonthlyNth: '毎月{nth}{weekday}', repeatYearly: '毎年{date}', repeatCustom: 'カスタム…',
    nth1: '第1', nth2: '第2', nth3: '第3', nth4: '第4', nth5: '第5', nthLast: '最終',
    // A rule in words
    ruleDaily: '毎日', ruleWeekly: '毎週', ruleMonthly: '毎月', ruleYearly: '毎年',
    ruleEveryDays: '{n}日ごと', ruleEveryWeeks: '{n}週間ごと', ruleEveryMonths: '{n}か月ごと', ruleEveryYears: '{n}年ごと',
    ruleOnWeekdays: v => `${no(v.rule)}平日`, ruleOnDays: v => `${no(v.rule)}${v.days}`,
    ruleOnNth: v => `${no(v.rule)}${v.nth}${v.weekday}`, ruleOnDay: v => `${no(v.rule)}${v.day}日`,
    ruleOnDate: v => `${no(v.rule)}${v.date}`, ruleUntil: '{rule}、{date}まで', ruleCount: '{rule}、{n}回',
    // Recurring event
    scopeDelete: '繰り返し予定を削除', scopeEdit: '繰り返し予定を編集', scopeChange: '繰り返し予定を変更',
    scopeThis: 'この予定', scopeFollowing: 'これ以降のすべての予定', scopeAll: 'すべての予定',
    // Messages
    untitled: '無題の予定', endAfterStart: '終了は開始より後にしてください',
    noPast: '予定を過去に移動することはできません', dayOff: '{date}は休日です',

    // Plugins
    'conflicts.overlaps': '{titles}と重複しています',
    'conflicts.bookedResource': '{resource}はすでに予約されています：「{title}」（{when}）',
    'conflicts.booked': 'この時間はすでに予約されています：「{title}」（{when}）',
    'eventDataModel.yes': 'はい', 'eventDataModel.no': 'いいえ',
    'ical.imported': '{n}件の予定をインポートしました',
    'ical.exported': '{n}件の予定を{file}にエクスポートしました',
    'ical.export': '.icsにエクスポート', 'ical.import': '.icsファイルをインポート',
    'restStorage.loadFailed': '予定を読み込めませんでした',
    'restStorage.saveFailed': '「{title}」を保存できませんでした',
    'restStorage.deleteFailed': '予定を削除できませんでした',
    'timeProgress.minutes': '{n}分', 'timeProgress.hours': '{h}時間', 'timeProgress.hoursMinutes': '{h}時間{m}分',
    'timeProgress.endsIn': 'あと{time}で終了', 'timeProgress.left': '· 残り{time}'
  });
})();
