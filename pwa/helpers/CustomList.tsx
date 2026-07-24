// pwa/helpers/CustomList.tsx
import { List, ListProps, Pagination } from 'react-admin';

// По избор: Конфигурираш и опциите в падащото меню глобално
const CustomPagination = () => (
    <Pagination rowsPerPageOptions={[5, 10, 25, 50]} />
);

export const CustomList = (props: ListProps) => (
    <List 
        perPage={25} 
        pagination={<CustomPagination />} 
        {...props} // Това прехвърля всички останали пропове като actions, empty, филтри и т.н.
    />
);