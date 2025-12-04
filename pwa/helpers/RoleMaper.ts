// src/roleMapper.js (АКТУАЛИЗИРАНА ВЕРСИЯ)

// ... (Оставяме ROLE_HIERARCHY и ROLE_TRANSLATIONS непроменени) ...

const ROLE_HIERARCHY = [
    'ROLE_SUPER_ADMIN', 
    'ROLE_ADMIN',
    'ROLE_MANAGER',
    'ROLE_USER'         
];

const ROLE_TRANSLATIONS = {
    'ROLE_SUPER_ADMIN': 'Супер Администратор',
    'ROLE_ADMIN': 'Администратор',
    'ROLE_MANAGER': 'Мениджър',
    'ROLE_USER': 'Оператор',
    'default': 'Потребител' 
};

/**
 * Намира най-високата роля и връща обект с превод и тип на ролята.
 * @returns {{text: string, type: string}} 
 */
export const getHighestRoleInfo = (rolesArray : any) => {
    if (!Array.isArray(rolesArray) || rolesArray.length === 0) {
        return { text: ROLE_TRANSLATIONS.default, type: 'default' };
    }

    for (const highestRole of ROLE_HIERARCHY) {
        if (rolesArray.includes(highestRole)) {
            // Връщаме ключа на ролята (напр. 'ADMIN' -> 'admin', 'USER' -> 'user')
            const roleKey = highestRole.replace('ROLE_', '').toLowerCase();
            return { 
                text: ROLE_TRANSLATIONS[highestRole as keyof typeof ROLE_TRANSLATIONS] || ROLE_TRANSLATIONS.default, 
                type: roleKey 
            };
        }
    }

    return { text: ROLE_TRANSLATIONS.default, type: 'default' };
};