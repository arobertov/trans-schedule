// src/components/RoleChip.js
import * as React from 'react';

// Дефиниране на стилове за "чиповете"
const styleMap = {
    // Стилове за всички чипове
    base: {
        borderRadius: '25px', 
        padding: '5px 15px',
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
        display: 'inline-block',
        minWidth: '120px', 
        margin: '2px 0',
    },
    // Цветови схеми
    admin: {
        backgroundColor: '#68B301', // Зелено/Лайм (за Админ)
        boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
    },
    user: {
        backgroundColor: '#007BFF', // Синьо (за Оператор)
        boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
    },
    // Може да добавите още цветове тук
};

/**
 * Custom компонент за изобразяване на ролята като стилизиран "чип" (chip).
 * @param {string} roleText - Преведения текст на ролята (напр. "Администратор").
 * @param {string} roleType - Типът роля (напр. 'admin', 'user') за избор на цвят.
 */
const RoleChip = ({ roleText, roleType }) => {
    // Избиране на стил въз основа на типа
    const chipStyle = roleType === 'admin' ? styleMap.admin : styleMap.user;
    
    // Комбиниране на базовия и специфичния стил
    const combinedStyle = { ...styleMap.base, ...chipStyle };

    return (
        <span style={combinedStyle}>
            {roleText}
        </span>
    );
};

export default RoleChip;