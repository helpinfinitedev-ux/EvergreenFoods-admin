import { useEffect, useState } from "react";
import api, { bankAPI } from "../../../../api";
import SectionTable from "../SectionTable/index";
import dayjs, { Dayjs } from "dayjs";
import CashBookDatePicker from "./CashBookDatePicker";
import Loader from "../../../../components/Loader";
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";

export default function CashBook() {
  const [cashIn, setCashIn] = useState<any[]>([]);
  const [cashOut, setCashOut] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const inTotal = cashIn.reduce((s, r) => s + r.amount, 0);
  const outTotal = cashOut.reduce((s, r) => s + r.amount, 0);
  const [loading, setLoading] = useState(false);
  const [banks, setBanks] = useState<any[]>([]);
  const [bankId, setBankId] = useState("cash");

  const selection = [
    {
      id: 1,
      type: "cash",
      label: "Cash",
    },
  ];

  useEffect(() => {
    const fetchCashFlow = async () => {
      setLoading(true);
      const date = selectedDate.format("YYYY-MM-DD");
      const res = await api.get("/admin/cash-flow", { params: { date, bankId } });

      const maxLength = Math.max(res.data?.cashIn?.length || 0, res.data?.cashOut?.length || 0);
      if (res?.data?.cashIn?.length < maxLength) {
        for (let i = res?.data?.cashIn?.length; i < maxLength; i++) {
          res.data?.cashIn?.push({
            narration: "-",
            amount: 0,
          });
        }
      }
      if (res?.data?.cashOut?.length < maxLength) {
        for (let i = res?.data?.cashOut?.length; i < maxLength; i++) {
          res.data?.cashOut?.push({
            narration: "-",
            amount: 0,
          });
        }
      }
      setCashIn(res.data?.cashIn?.slice(0, maxLength) || []);
      setCashOut(res.data?.cashOut?.slice(0, maxLength) || []);
      setLoading(false);
    };
    fetchCashFlow();
  }, [selectedDate, bankId]);

  useEffect(() => {
    const loadBanks = async () => {
      try {
        const res = await bankAPI.getAll();
        setBanks(res.data || []);
      } catch (err) {
        console.error("Failed to load banks", err);
      }
    };
    loadBanks();
  }, []);

  return (
    <div className="w-full min-h-screen bg-transparent">
      {loading && <Loader />}
      <div className="mx-auto max-w-full">
        {" "}
        <div className="flex items-center justify-end gap-2 p-3">
          <CashBookDatePicker value={selectedDate} onChange={setSelectedDate} />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Bank</InputLabel>
            <Select
              label="Bank"
              value={bankId}
              onChange={(e) => {
                const value = e.target.value;
                setBankId(String(value));
              }}>
              <MenuItem value="cash">Cash</MenuItem>
              {banks.map((bank) => (
                <MenuItem key={bank.id} value={bank.id}>
                  {bank.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
      </div>
      <div className="mx-auto max-w-full border-2 border-neutral-700 bg-transparent">
        <div className="grid grid-cols-2">
          <SectionTable title="Cash In" columns={["Narration", "Amount"]} rows={cashIn.map((r) => [r.narration || "-", r.amount || "-"])} total={inTotal} />
          <SectionTable title="Cash Out" columns={["Narration", "Amount"]} rows={cashOut.map((r) => [r.narration || "-", r.amount || "-"])} total={outTotal} rightBorder={false} />
        </div>
      </div>
    </div>
  );
}
