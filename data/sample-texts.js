/* Translations of the demo's sample data, by language: the events of events.json (by id), the titles
 * the performance test generates (same order as generateEvents.TITLES), and the calendar and category
 * names. English is the data itself (events.json, generate-events.js, demo.js).
 *
 * demo.js picks the language of Customize → Locale. Events still showing a sample text (in any of
 * these languages) take the new language's; events you renamed keep your text.
 */
(function (root) {
  root.SAMPLE_TEXTS = {
    fr: {
      events: {
        1: { title: 'Point quotidien de l’équipe' },
        2: { title: 'Déjeuner avec Mike' },
        3: { title: 'Revue produit (chevauchement)', location: 'Salle 4.12' },
        4: { title: 'Synchro dev' },
        5: { title: 'Atelier d’architecture', description: 'Architecture cible du service de réservation.\nApportez les diagrammes C4.' },
        6: { title: 'Salle de sport et cardio' },
        7: { title: 'Conférence produit' },
        8: { title: 'Fermeture de l’entreprise' },
        9: { title: 'Revue de sprint' },
        10: { title: 'Anniversaire de l’équipe' },
        11: { title: 'Pause déjeuner' },
        12: { title: 'Maintenance du bureau 2' }
      },
      generated: ['Réunion d’équipe', 'Appel client', 'Revue de code', 'Revue de design', 'Tête-à-tête', 'Atelier', 'Formation',
        'Planification de sprint', 'Déjeuner', 'Entretien', 'Démo', 'Permanence support', 'Temps de concentration', 'Revue budgétaire', 'Visite de site'],
      calendars: { work: 'Travail', personal: 'Personnel' },
      categories: { meeting: 'Réunion', workshop: 'Atelier', social: 'Convivialité', sport: 'Sport' }
    },
    de: {
      events: {
        1: { title: 'Team-Standup' },
        2: { title: 'Mittagessen mit Mike' },
        3: { title: 'Produkt-Review (überschneidend)', location: 'Raum 4.12' },
        4: { title: 'Dev-Abstimmung' },
        5: { title: 'Architektur-Workshop', description: 'Zielarchitektur für den Buchungsdienst.\nBitte die C4-Diagramme mitbringen.' },
        6: { title: 'Fitnessstudio & Cardio' },
        7: { title: 'Produktkonferenz' },
        8: { title: 'Betriebsferien' },
        9: { title: 'Sprint-Review' },
        10: { title: 'Team-Geburtstag' },
        11: { title: 'Mittagspause' },
        12: { title: 'Wartung Schreibtisch 2' }
      },
      generated: ['Teambesprechung', 'Kundengespräch', 'Code-Review', 'Design-Review', 'Einzelgespräch', 'Workshop', 'Schulung',
        'Sprint-Planung', 'Mittagessen', 'Vorstellungsgespräch', 'Demo', 'Support-Schicht', 'Fokuszeit', 'Budgetprüfung', 'Ortsbesichtigung'],
      calendars: { work: 'Arbeit', personal: 'Privat' },
      categories: { meeting: 'Besprechung', workshop: 'Workshop', social: 'Geselliges', sport: 'Sport' }
    },
    es: {
      events: {
        1: { title: 'Reunión diaria del equipo' },
        2: { title: 'Comida con Mike' },
        3: { title: 'Revisión de producto (solapada)', location: 'Sala 4.12' },
        4: { title: 'Sincronización de desarrollo' },
        5: { title: 'Taller de arquitectura', description: 'Arquitectura objetivo del servicio de reservas.\nTraed los diagramas C4.' },
        6: { title: 'Gimnasio y cardio' },
        7: { title: 'Conferencia de producto' },
        8: { title: 'Cierre de la empresa' },
        9: { title: 'Revisión del sprint' },
        10: { title: 'Cumpleaños del equipo' },
        11: { title: 'Pausa para comer' },
        12: { title: 'Mantenimiento del puesto 2' }
      },
      generated: ['Reunión de equipo', 'Llamada con cliente', 'Revisión de código', 'Revisión de diseño', 'Reunión individual', 'Taller', 'Formación',
        'Planificación del sprint', 'Comida', 'Entrevista', 'Demo', 'Turno de soporte', 'Tiempo de concentración', 'Revisión de presupuesto', 'Visita in situ'],
      calendars: { work: 'Trabajo', personal: 'Personal' },
      categories: { meeting: 'Reunión', workshop: 'Taller', social: 'Social', sport: 'Deporte' }
    },
    it: {
      events: {
        1: { title: 'Stand-up del team' },
        2: { title: 'Pranzo con Mike' },
        3: { title: 'Revisione prodotto (sovrapposta)', location: 'Sala 4.12' },
        4: { title: 'Allineamento sviluppo' },
        5: { title: 'Workshop di architettura', description: 'Architettura di riferimento del servizio di prenotazione.\nPortate i diagrammi C4.' },
        6: { title: 'Palestra e cardio' },
        7: { title: 'Conferenza di prodotto' },
        8: { title: 'Chiusura aziendale' },
        9: { title: 'Revisione dello sprint' },
        10: { title: 'Compleanno del team' },
        11: { title: 'Pausa pranzo' },
        12: { title: 'Manutenzione postazione 2' }
      },
      generated: ['Riunione di team', 'Chiamata cliente', 'Revisione del codice', 'Revisione del design', 'Colloquio individuale', 'Workshop', 'Formazione',
        'Pianificazione sprint', 'Pranzo', 'Colloquio', 'Demo', 'Turno di supporto', 'Tempo di concentrazione', 'Revisione del budget', 'Sopralluogo'],
      calendars: { work: 'Lavoro', personal: 'Personale' },
      categories: { meeting: 'Riunione', workshop: 'Workshop', social: 'Socialità', sport: 'Sport' }
    },
    ja: {
      events: {
        1: { title: 'チーム朝会' },
        2: { title: 'マイクとランチ' },
        3: { title: '製品レビュー（重複）', location: '会議室 4.12' },
        4: { title: '開発の同期' },
        5: { title: 'アーキテクチャ・ワークショップ', description: '予約サービスの目標アーキテクチャ。\nC4図を持参してください。' },
        6: { title: 'ジム＆有酸素運動' },
        7: { title: '製品カンファレンス' },
        8: { title: '会社休業日' },
        9: { title: 'スプリントレビュー' },
        10: { title: 'チームの誕生日会' },
        11: { title: '昼休み' },
        12: { title: 'デスク2のメンテナンス' }
      },
      generated: ['チームミーティング', '顧客との電話', 'コードレビュー', 'デザインレビュー', '1on1', 'ワークショップ', '研修',
        'スプリント計画', 'ランチ', '面接', 'デモ', 'サポート当番', '集中タイム', '予算レビュー', '現地視察'],
      calendars: { work: '仕事', personal: '個人' },
      categories: { meeting: '会議', workshop: 'ワークショップ', social: '交流', sport: 'スポーツ' }
    }
  };
})(this);
