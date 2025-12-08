-- ========================================
-- SQL СКРИПТ ЗА СЪЗДАВАНЕ НА БАЗАТА ДАННИ
-- Платформа за управление на графици
-- ========================================

-- Създаване на базата данни (ако не съществува)
CREATE DATABASE IF NOT EXISTS timetable_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE timetable_db;

-- ========================================
-- 1. ТАБЛИЦА: positions (Длъжности)
-- ========================================

CREATE TABLE IF NOT EXISTS positions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE COMMENT 'Наименование на длъжност',
    has_shifts BOOLEAN DEFAULT false COMMENT 'Има ли смени (машинисти)',
    fixed_start_time TIME NULL COMMENT 'Начален час за фиксирано време',
    fixed_end_time TIME NULL COMMENT 'Краен час за фиксирано време',
    works_holidays BOOLEAN DEFAULT true COMMENT 'Работи ли в празници',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Вмъкване на начални длъжности
INSERT INTO positions (name, has_shifts, fixed_start_time, fixed_end_time) VALUES
('Машинист ПЖМ', true, NULL, NULL),
('Машинист-инструктор', true, NULL, NULL),
('Машинист СПС', true, NULL, NULL),
('Депомайстор', false, '08:00:00', '16:00:00'),
('Чистач ПС', false, '08:00:00', '16:00:00'),
('Маневрист', false, '08:00:00', '16:00:00');

-- ========================================
-- 2. ТАБЛИЦА: employees (Служители)
-- ========================================

CREATE TABLE IF NOT EXISTS employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL COMMENT 'Име',
    middle_name VARCHAR(50) NOT NULL COMMENT 'Презиме',
    last_name VARCHAR(50) NOT NULL COMMENT 'Фамилия',
    position_id INT NOT NULL COMMENT 'Връзка към длъжност',
    phone VARCHAR(20) NULL COMMENT 'Телефон',
    email VARCHAR(100) NULL COMMENT 'Имейл',
    status ENUM('active', 'inactive', 'on_leave', 'dismissed') NOT NULL DEFAULT 'active' COMMENT 'Статус',
    notes TEXT NULL COMMENT 'Забележка',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE RESTRICT,
    INDEX idx_position (position_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 3. ТАБЛИЦА: shift_schedules (График на смените)
-- ========================================

CREATE TABLE IF NOT EXISTS shift_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    shift_code VARCHAR(20) NOT NULL COMMENT 'Код на смяна (СМ1-С, СМ2-Д)',
    day_type ENUM('Делник', 'Празник') NOT NULL COMMENT 'Тип ден',
    season ENUM('Зимен', 'Летен') NOT NULL COMMENT 'Сезон',
    worked_time DECIMAL(5,2) NOT NULL COMMENT 'Отработено време (часове)',
    night_work DECIMAL(5,2) DEFAULT 0 COMMENT 'Нощен труд (часове)',
    total_time DECIMAL(5,2) GENERATED ALWAYS AS (worked_time + (night_work * 0.143)) STORED COMMENT 'Общо време с коефициент',
    kilometers DECIMAL(7,2) DEFAULT 0 COMMENT 'Километри',
    zero_time DECIMAL(5,2) DEFAULT 0 COMMENT 'Нулево време (престой)',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_shift (shift_code, day_type, season),
    INDEX idx_day_season (day_type, season)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 4. ТАБЛИЦА: order_patterns (Порядъци)
-- ========================================

CREATE TABLE IF NOT EXISTS order_patterns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE COMMENT 'Наименование (порядък_92)',
    total_positions INT NOT NULL COMMENT 'Общ брой позиции',
    is_active BOOLEAN DEFAULT false COMMENT 'Активен ли е',
    description TEXT NULL COMMENT 'Описание',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 5. ТАБЛИЦА: order_pattern_details (Детайли на порядъка)
-- ========================================

CREATE TABLE IF NOT EXISTS order_pattern_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_pattern_id INT NOT NULL COMMENT 'Връзка към порядък',
    position_number INT NOT NULL COMMENT 'Номер на позицията (ред)',
    weekday VARCHAR(20) NULL COMMENT 'Код на смяна за делник',
    weekday_to_holiday VARCHAR(20) NULL COMMENT 'Делник към празник',
    holiday_to_weekday VARCHAR(20) NULL COMMENT 'Празник към делник',
    holiday_between_weekdays VARCHAR(20) NULL COMMENT 'Празник между делници',
    holiday_between_holidays VARCHAR(20) NULL COMMENT 'Празник между празници',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_pattern_id) REFERENCES order_patterns(id) ON DELETE CASCADE,
    UNIQUE KEY unique_position (order_pattern_id, position_number),
    INDEX idx_order_position (order_pattern_id, position_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 6. ТАБЛИЦА: monthly_schedules (Месечни графици)
-- ========================================

CREATE TABLE IF NOT EXISTS monthly_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    year INT NOT NULL COMMENT 'Година',
    month INT NOT NULL COMMENT 'Месец (1-12)',
    order_pattern_id INT NOT NULL COMMENT 'Използван порядък',
    season ENUM('winter', 'summer') NOT NULL COMMENT 'Активен сезон',
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft' COMMENT 'Статус на графика',
    created_by INT NULL COMMENT 'Създаден от оператор',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_pattern_id) REFERENCES order_patterns(id) ON DELETE RESTRICT,
    UNIQUE KEY unique_month (year, month),
    INDEX idx_order (order_pattern_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 7. ТАБЛИЦА: schedule_assignments (Назначения на машинисти)
-- ========================================

CREATE TABLE IF NOT EXISTS schedule_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    schedule_id INT NOT NULL COMMENT 'Връзка към месечен график',
    employee_id INT NOT NULL COMMENT 'Връзка към служител',
    position_number INT NOT NULL COMMENT 'Позиция в матрицата (ред)',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (schedule_id) REFERENCES monthly_schedules(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT,
    UNIQUE KEY unique_employee_schedule (schedule_id, employee_id),
    UNIQUE KEY unique_position_schedule (schedule_id, position_number),
    INDEX idx_schedule (schedule_id),
    INDEX idx_employee (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 8. ТАБЛИЦА: schedule_overrides (Ръчни промени в графика)
-- ========================================

CREATE TABLE IF NOT EXISTS schedule_overrides (
    id INT AUTO_INCREMENT PRIMARY KEY,
    schedule_id INT NOT NULL COMMENT 'Връзка към месечен график',
    employee_id INT NOT NULL COMMENT 'Връзка към служител',
    day_number INT NOT NULL COMMENT 'Ден от месеца (1-31)',
    override_type ENUM('O', 'B', 'U', 'A', 'M', 'PR', 'P') NOT NULL COMMENT 'Тип на промяната',
    notes TEXT NULL COMMENT 'Забележка',
    created_by INT NULL COMMENT 'Въведено от оператор',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (schedule_id) REFERENCES monthly_schedules(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT,
    UNIQUE KEY unique_override (schedule_id, employee_id, day_number),
    INDEX idx_schedule_day (schedule_id, day_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 9. ТАБЛИЦА: employee_work_log (Лична сметка на служител)
-- ========================================

CREATE TABLE IF NOT EXISTS employee_work_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL COMMENT 'Връзка към служител',
    schedule_id INT NOT NULL COMMENT 'Връзка към месечен график',
    day_number INT NOT NULL COMMENT 'Ден от месеца (1-31)',
    shift_code VARCHAR(20) NULL COMMENT 'Код на смяна',
    worked_time DECIMAL(5,2) DEFAULT 0 COMMENT 'Отработено време',
    night_work DECIMAL(5,2) DEFAULT 0 COMMENT 'Нощен труд',
    total_time DECIMAL(5,2) DEFAULT 0 COMMENT 'Общо ангажирано време',
    kilometers DECIMAL(7,2) DEFAULT 0 COMMENT 'Километри',
    zero_time DECIMAL(5,2) DEFAULT 0 COMMENT 'Нулево време',
    override_type ENUM('O', 'B', 'U', 'A', 'M', 'PR', 'P') NULL COMMENT 'Тип на деня',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (schedule_id) REFERENCES monthly_schedules(id) ON DELETE CASCADE,
    UNIQUE KEY unique_work_log (employee_id, schedule_id, day_number),
    INDEX idx_employee_schedule (employee_id, schedule_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 10. ТАБЛИЦА: users (Потребители/Оператори)
-- ========================================

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE COMMENT 'Потребителско име',
    password_hash VARCHAR(255) NOT NULL COMMENT 'Хеширана парола',
    full_name VARCHAR(150) NOT NULL COMMENT 'Пълно име',
    role ENUM('admin', 'operator') DEFAULT 'operator' COMMENT 'Роля',
    is_active BOOLEAN DEFAULT true COMMENT 'Активен ли е',
    last_login DATETIME NULL COMMENT 'Последно влизане',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Вмъкване на администратор по подразбиране
-- Парола: admin123 (ВАЖНО: Смени я след първо влизане!)
INSERT INTO users (username, password_hash, full_name, role) VALUES
('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Администратор', 'admin');

-- ========================================
-- 11. ТАБЛИЦА: audit_log (Одит лог)
-- ========================================

CREATE TABLE IF NOT EXISTS audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL COMMENT 'Връзка към потребител',
    action_type VARCHAR(50) NOT NULL COMMENT 'Тип на действието',
    table_name VARCHAR(50) NULL COMMENT 'Засегната таблица',
    record_id INT NULL COMMENT 'ID на записа',
    old_value TEXT NULL COMMENT 'Стара стойност (JSON)',
    new_value TEXT NULL COMMENT 'Нова стойност (JSON)',
    ip_address VARCHAR(45) NULL COMMENT 'IP адрес',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_time (user_id, created_at),
    INDEX idx_table_record (table_name, record_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- ДОПЪЛНИТЕЛНИ FOREIGN KEY ВРЪЗКИ
-- ========================================

-- Добавяне на foreign key за created_by в monthly_schedules
ALTER TABLE monthly_schedules 
ADD FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- Добавяне на foreign key за created_by в schedule_overrides
ALTER TABLE schedule_overrides 
ADD FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- ========================================
-- ЗАВЪРШВАНЕ
-- ========================================

-- Проверка на създадените таблици
SHOW TABLES;

-- Показване на структурата на всяка таблица
SELECT 
    TABLE_NAME as 'Таблица',
    TABLE_ROWS as 'Брой редове'
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'timetable_db'
ORDER BY TABLE_NAME;