// src/components/RoleChip.tsx
import React, { CSSProperties } from 'react';

// Дефиниране на стилове за "чиповете"
const styleMap: {
    base: CSSProperties;
    admin: CSSProperties;
    operator: CSSProperties,
    user: CSSProperties;
} = {
    // Стилове за всички чипове
    base: {
        borderRadius: '25px', 
        padding: '5px 15px',
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center' as const,
        display: 'inline-block',
        minWidth: '120px', 
        margin: '2px 0',
    },
    // Цветови схеми
    admin: {
        backgroundColor: '#21a1ae', // Зелено/Лайм (за Админ)
        boxShadow: '0 2px 5px rgba(124, 255, 2, 0.21)',
    },
    operator: {
        backgroundColor: '#ffc400', 
        boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
    },
    user: {
        backgroundColor: '#007BFF', 
        boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
    },
    // Може да добавите още цветове тук
};

interface RoleChipProps {
    roleText: string;
    roleType: string;
}

/**
 * Custom компонент за изобразяване на ролята като стилизиран "чип" (chip).
 * @param {string} roleText - Преведения текст на ролята (напр. "Администратор").
 * @param {string} roleType - Типът роля (напр. 'admin', 'user') за избор на цвят.
 */
const RoleChip: React.FC<RoleChipProps> = ({ roleText, roleType }: RoleChipProps) => {
    // Избиране на стил въз основа на типа
    const chipStyle = roleType === 'super_admin'&&'admin' ? styleMap.admin : roleType === 'operator' ? styleMap.operator: styleMap.user;
    
    // Комбиниране на базовия и специфичния стил
    const combinedStyle = { ...styleMap.base, ...chipStyle };

    return (
        <span style={combinedStyle}>
            {roleText}
        </span>
    );
};

export default RoleChip;
