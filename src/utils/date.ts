import moment from "moment";
import "moment-timezone";

const DateService = {
  getDurationMinutes: (value = 0) => (value > 0 ? moment.duration(value, "minutes").humanize() : "0 seconds"),

  getDurationString: (seconds = 0) => {
    let hours = seconds / 3600;
    let mins = (seconds % 3600) / 60;
    const secs = (mins * 60) % 60;

    hours = Math.trunc(hours);
    mins = Math.trunc(mins);

    if (!hours && !mins && !secs) return "0 sec";

    if (hours) {
      if (mins) {
        return secs ? `${hours} hr ${mins} min & ${secs} sec` : `${hours} hr & ${mins} min`;
      }
      return secs ? `${hours} hr & ${secs} sec` : `${hours} hr`;
    }
    if (mins) return secs ? `${mins} min & ${secs} sec` : `${mins} min`;
    return secs ? `${secs} sec` : "None";
  },

  getMonthString: (value = "") => moment(new Date(value)).format("MMMM-YYYY"),

  getDateRange: (value: [string, string]) => [value[0] ? new Date(value[0]).toISOString() : "", value[1] ? new Date(value[1]).toISOString() : ""],

  getMomentDateRange: (value: { startDate: string; endDate: string }) => ({
    startDate: value.startDate ? moment(value.startDate) : null,
    endDate: value.endDate ? moment(value.endDate) : null,
  }),

  getShortDateString: (value: string) => (value ? moment(value.replace("Z", "")).format("ddd, MMM DD") : ""),

  getDateString: (value: string, format = "ddd, MMM DD, YYYY") => (value ? moment(value.replace("Z", "")).format(format) : ""),

  getTimeString: (value: string) => (value ? moment(value.replace("Z", "")).format("HH:mm") : ""),

  getDateTimeString: (value: string) => (value ? moment(value.replace("Z", "")).format("ddd, MMM DD, YYYY, HH:mm") : ""),
  getShortDateTimeString: (value: string) => (value ? moment(value.replace("Z", "")).format("DD MMM, HH:mm") : ""),

  getDateInDDMMYYYY: (value: string) => moment(value).format("DD MMM, YYYY"),
  getDateInDDMMYYYYWithSlashes: (value: string) => (value ? moment(value).format("DD/MM/YYYY") : ""),
  getDateInMMDDYYYY: (value: string) => moment(value).format("MMM DD, YYYY"),
  getFormattedDate: (value: string) =>
    value
      ? new Date(value).toLocaleDateString(undefined, {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "",
  getFormattedYear: (value: string) =>
    value
      ? new Date(value).toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
        })
      : "",
  getNumericDate: (value: string) =>
    value
      ? new Date(value).toLocaleDateString("fr-CH", {
          day: "numeric",
          month: "numeric",
          year: "numeric",
        })
      : "",

  getFormattedDateTime: (value: string) =>
    value
      ? new Date(value).toLocaleDateString(undefined, {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "numeric",
          hour12: false,
        })
      : "",
  getShortFormattedDate: (value: string) => {
    if (!value) return "";
    // Always format in UK timezone
    const ukMoment = moment(value).tz("Europe/London");

    const day = ukMoment.date().toString().padStart(2, "0");
    const month = ukMoment.format("MMM");
    const hours = ukMoment.hours().toString().padStart(2, "0");
    const minutes = ukMoment.minutes().toString().padStart(2, "0");

    return `${day} ${month}, ${hours}:${minutes}`;
  },

  getFormattedTime: (value: string) =>
    value
      ? new Date(value).toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "numeric",
          hour12: false,
        })
      : "",

  getFormattedUTCTime: (value: string) => (value ? new Date(value).toISOString().split("T")[1].slice(0, 5) : ""),

  getTimeOnly: (value: string) => {
    const valArr = value?.split(":");

    return value ? `${valArr[0]}:${valArr[1]}` : "";
  },
  getTimeAgo: (value: string) => {
    const currentTime = moment.utc();
    const createdTime = moment(value);

    const timeDifference = moment.duration(currentTime.diff(createdTime));

    if (timeDifference.asMinutes() < 1) {
      return "just now";
    }
    if (timeDifference.asHours() < 1) {
      const minutes = Math.floor(timeDifference.asMinutes());
      return `${minutes}m ago`;
    }
    if (timeDifference.asDays() < 1) {
      const hours = Math.floor(timeDifference.asHours());
      return `${hours}h ago`;
    }
    const days = Math.floor(timeDifference.asDays());
    if (days === 1) {
      return "1 day ago";
    }
    return `${days} days ago`;
  },
  getAgeFromYYYYMMDD: (dateOfBirth: string) => {
    const dobTimestamp = Date.parse(dateOfBirth);
    if (Number.isNaN(dobTimestamp)) {
      return null; // Invalid date format
    }

    const dobDate = new Date(dobTimestamp);
    const today = new Date();

    let age = today.getUTCFullYear() - dobDate.getUTCFullYear();
    const monthDiff = today.getUTCMonth() - dobDate.getUTCMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < dobDate.getUTCDate())) {
      age -= 1;
    }

    return age;
  },
  calculateDurationInDays: (startDate: string, endDate: string) => {
    const start = moment(startDate);
    const end = moment(endDate);

    const durationInDays = end.diff(start, "days") + 1;

    if (durationInDays > 31) {
      const durationInMonths = end.diff(start, "months");
      const remainingDays = end.diff(start.add(durationInMonths, "months"), "days");
      return `${durationInMonths} months ${remainingDays}${" "}`;
    }

    return `${durationInDays}`;
  },
  getDateInYYYYMMDD: (date: string) => moment(date).format("YYYYMMDD"),
  getDateInDDMMYY: (value: string) => moment(value).format("DD-MM-YY"),
  getDayOfWeek: (value: string) => moment(value).format("dddd"),
  getCurrentMonthStartAndToday: () => {
    const today = new Date();
    return {
      startDate: new Date(today.getFullYear(), today.getMonth(), 1).toISOString(),
      endDate: today.toISOString(),
    };
  },
  getDateOfBirthWithAge: (dateOfBirth: string) => {
    if (!dateOfBirth) return "—";

    const dobMoment = moment(dateOfBirth);
    if (!dobMoment.isValid()) return "—";

    const formattedDate = dobMoment.format("DD/MM/YYYY");

    const today = moment();
    const age = today.diff(dobMoment, "years");

    return `${formattedDate} (Age ${age})`;
  },
  getDateInDDMonthNameYYYY: (date: string) =>
    new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),

  formatUKDate: (date: Date) =>
    date.toLocaleString("en-GB", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }),
  formatDatePdf: (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
};

export default DateService;
