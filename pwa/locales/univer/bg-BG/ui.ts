/**
 * Copyright 2023-present DreamNum Co., Ltd.
 */

const UIBgBG = {
    toolbar: {
        heading: {
            normal: 'Нормален',
            title: 'Заглавие',
            subTitle: 'Подзаглавие',
            1: 'Заглавие 1',
            2: 'Заглавие 2',
            3: 'Заглавие 3',
            4: 'Заглавие 4',
            5: 'Заглавие 5',
            6: 'Заглавие 6',
            tooltip: 'Задаване на заглавие',
        },
    },
    ribbon: {
        start: 'Начало',
        startDesc: 'Инициализиране на работния лист и задаване на основни параметри.',
        insert: 'Вмъкване',
        insertDesc: 'Вмъкване на редове, колони, диаграми и други елементи.',
        formulas: 'Формули',
        formulasDesc: 'Използване на функции и формули за изчисления.',
        data: 'Данни',
        dataDesc: 'Управление на данни, включително импорт, сортиране и филтриране.',
        view: 'Изглед',
        viewDesc: 'Превключване на режими на изглед и настройки на дисплея.',
        others: 'Други',
        othersDesc: 'Други функции и настройки.',
        more: 'Още',
    },
    fontFamily: {
        'not-supported': 'Шрифтът не е намерен в системата, използва се шрифт по подразбиране.',
        arial: 'Arial',
        'times-new-roman': 'Times New Roman',
        tahoma: 'Tahoma',
        verdana: 'Verdana',
        'microsoft-yahei': 'Microsoft YaHei',
        simsun: 'SimSun',
        simhei: 'SimHei',
        kaiti: 'Kaiti',
        fangsong: 'FangSong',
        nsimsun: 'NSimSun',
        stxinwei: 'STXinwei',
        stxingkai: 'STXingkai',
        stliti: 'STLiti',
    },
    'shortcut-panel': {
        title: 'Преки пътища',
    },
    shortcut: {
        undo: 'Отмяна',
        redo: 'Повторение',
        cut: 'Изрязване',
        copy: 'Копиране',
        paste: 'Поставяне',
        'shortcut-panel': 'Превключване на панела с преки пътища',
    },
    'common-edit': 'Чести преки пътища за редактиране',
    'toggle-shortcut-panel': 'Превключване на панела с преки пътища',
    clipboard: {
        authentication: {
            title: 'Достъпът е отказан',
            content: 'Моля, разрешете на Univer достъп до клипборда.',
        },
    },
    textEditor: {
        formulaError: 'Моля, въведете валидна формула, например =SUM(A1)',
        rangeError: 'Моля, въведете валиден диапазон, например A1:B10',
    },
    rangeSelector: {
        title: 'Избор на диапазон от данни',
        addAnotherRange: 'Добави диапазон',
        buttonTooltip: 'Избери диапазон от данни',
        placeHolder: 'Изберете диапазон или въведете.',
        confirm: 'Потвърди',
        cancel: 'Отказ',
    },
    'global-shortcut': 'Глобален пряк път',
    'zoom-slider': {
        resetTo: 'Върни на',
    },
};

export default UIBgBG;