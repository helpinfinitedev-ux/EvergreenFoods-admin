import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import type { Dayjs } from "dayjs";

type CashBookDatePickerProps = {
  value: Dayjs;
  onChange: (value: Dayjs) => void;
};

export default function CashBookDatePicker({ value, onChange }: CashBookDatePickerProps) {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DatePicker
        label="Select Date"
        value={value}
        onChange={(newValue: Dayjs | null) => {
          if (newValue) onChange(newValue);
        }}
        slotProps={{ textField: { size: "small", sx: { width: 180 } } }}
        disableFuture
      />
    </LocalizationProvider>
  );
}
