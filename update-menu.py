import re
with open('pwa/components/admin/CustomMenu.tsx', 'r') as f:
    text = f.read()

# Define the custom styled MenuItemLink that strips rightIcon
add = """import { styled } from '@mui/material/styles';

const StyledMenuItemLink = styled(MenuItemLink, {
  shouldForwardProp: (prop) => prop !== 'rightIcon',
})(({ theme }) => ({
  // empty
}));
"""

text = text.replace("import { Collapse, List } from '@mui/material';", "import { Collapse, List } from '@mui/material';\n" + add)

# Or simpler: just remove rightIcon, as standard MenuItemLink doesn't support it anymore in recent react-admin versions
text = re.sub(r'\s*rightIcon=\{[^}]+\}', '', text)

with open('pwa/components/admin/CustomMenu.tsx', 'w') as f:
    f.write(text)
