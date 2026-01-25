import { styled } from "@mui/material/styles";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

export function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div role="tabpanel" hidden={value !== index} id={`entity-tabpanel-${index}`} aria-labelledby={`entity-tab-${index}`} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export function a11yProps(index: number) {
  return {
    id: `entity-tab-${index}`,
    "aria-controls": `entity-tabpanel-${index}`,
  };
}

export const StyledTabs = styled(Tabs)({
  borderBottom: "1px solid #e5e7eb",
  "& .MuiTabs-indicator": {
    backgroundColor: "#3b82f6",
    height: 3,
    borderRadius: "3px 3px 0 0",
  },
});

export const StyledTab = styled(Tab)({
  textTransform: "none",
  fontWeight: 600,
  fontSize: "15px",
  marginRight: "8px",
  color: "#6b7280",
  "&.Mui-selected": {
    color: "#3b82f6",
  },
  "&:hover": {
    color: "#3b82f6",
    opacity: 1,
  },
});

// Styled components for lists
export const ListContainer = styled(Box)({
  background: "white",
  borderRadius: "12px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  overflow: "hidden",
});

export const ListItem = styled(Box)({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "16px 20px",
  borderBottom: "1px solid #e5e7eb",
  "&:last-child": {
    borderBottom: "none",
  },
  "&:hover": {
    backgroundColor: "#f9fafb",
  },
});

export const ListItemName = styled("span")({
  fontWeight: 600,
  fontSize: "15px",
  color: "#111827",
});

export const ListItemSecondary = styled("span")({
  fontSize: "13px",
  color: "#6b7280",
  marginLeft: "8px",
});

export const ListItemAmount = styled("span")<{ positive?: boolean }>(({ positive }) => ({
  fontWeight: 700,
  fontSize: "15px",
  color: positive ? "#10b981" : "#dc2626",
}));

export const EmptyState = styled(Box)({
  padding: "40px",
  textAlign: "center",
  color: "#6b7280",
  fontSize: "15px",
});

export const SearchInput = styled("input")({
  width: "100%",
  padding: "12px 16px",
  fontSize: "15px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  outline: "none",
  boxSizing: "border-box",
  marginBottom: "16px",
  "&:focus": {
    borderColor: "#3b82f6",
    boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
  },
});
