import { usePermissions } from 'react-admin';

/**
 * Кратките имена на ролите. Използвай тези константи вместо директни стрингове.
 * Пример: ROLES.ADMIN, ROLES.OPERATOR
 */
export const ROLES = {
    SUPER_ADMIN: 'ROLE_SUPER_ADMIN',
    ADMIN:       'ROLE_ADMIN',
    OPERATOR:    'ROLE_OPERATOR',
    CONTROL:     'ROLE_CONTROL',
    LIMITED:     'ROLE_LIMITED',
    USER:        'ROLE_USER',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

const ROLE_HIERARCHY: Role[] = [
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.OPERATOR,
    ROLES.CONTROL,
    ROLES.LIMITED,
    ROLES.USER,
];

const ROLE_LEVELS = ROLE_HIERARCHY.reduce<Record<string, number>>((acc, role, index) => {
    acc[role] = index;
    return acc;
}, {});

const ROLE_TRANSLATIONS: Record<string, string> = {
    [ROLES.SUPER_ADMIN]: 'Супер Администратор',
    [ROLES.ADMIN]:       'Администратор',
    [ROLES.OPERATOR]:    'Оператор',
    [ROLES.CONTROL]:     'Мениджмънт',
    [ROLES.LIMITED]:     'Ограничен',
    default:             'Потребител',
};

/** Нормализира кратко или пълно роля-име до вътрешния ROLE_X формат. */
const toRoleKey = (role: string): string =>
    role.startsWith('ROLE_') ? role : `ROLE_${role.toUpperCase()}`;

const normalizeRoles = (roles: any): string[] => {
    if (Array.isArray(roles)) {
        return roles.filter((role): role is string => typeof role === 'string');
    }

    if (typeof roles === 'string' && roles.trim() !== '') {
        return [roles];
    }

    if (roles && typeof roles === 'object' && Array.isArray(roles.roles)) {
        return roles.roles.filter((role: unknown): role is string => typeof role === 'string');
    }

    return [];
};

const getHighestKnownRole = (roles: string[]): string | null => {
    for (const highestRole of ROLE_HIERARCHY) {
        if (roles.includes(highestRole)) {
            return highestRole;
        }
    }

    return null;
};

/**
 * Проверява дали потребителят има минимум нужната роля според йерархията.
 * Пример: hasMinimumRole(userRoles, 'ROLE_ADMIN') => true за ADMIN и SUPER_ADMIN.
 */
export const hasMinimumRole = (userRoles: any, minimumRole: string): boolean => {
    const roles = normalizeRoles(userRoles);
    if (roles.length === 0) {
        return false;
    }

    const highestKnownRole = getHighestKnownRole(roles);
    if (!highestKnownRole) {
        return false;
    }

    const userLevel = ROLE_LEVELS[highestKnownRole];
    const requiredLevel = ROLE_LEVELS[toRoleKey(minimumRole)];

    if (userLevel === undefined || requiredLevel === undefined) {
        return false;
    }

    return userLevel <= requiredLevel;
};

/**
 * Намира най-високата роля и връща обект с превод и тип на ролята.
 * @returns {{text: string, type: string}} 
 */
export const getHighestRoleInfo = (rolesArray : any) => {
    const roles = normalizeRoles(rolesArray);

    if (roles.length === 0) {
        return { text: ROLE_TRANSLATIONS.default, type: 'default' };
    }

    const highestRole = getHighestKnownRole(roles);
    if (highestRole) {
        // Връщаме ключа на ролята (напр. 'ADMIN' -> 'admin', 'USER' -> 'user')
        const roleKey = highestRole.replace('ROLE_', '').toLowerCase();
        return {
            text: ROLE_TRANSLATIONS[highestRole as keyof typeof ROLE_TRANSLATIONS] || ROLE_TRANSLATIONS.default,
            type: roleKey
        };
    }

    return { text: ROLE_TRANSLATIONS.default, type: 'default' };
};

/**
 * Hook, който връща функция can(role) за проверка на роли в компонент.
 * Пример: const can = useCan(); can(ROLES.ADMIN) или can('admin')
 */
export const useCan = () => {
    const { permissions } = usePermissions();
    return (minimumRole: string) => hasMinimumRole(permissions, minimumRole);
};