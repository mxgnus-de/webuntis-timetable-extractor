import { WebUntis } from "webuntis";
import { HttpsProxyAgent } from "https-proxy-agent";
import readline from "readline-sync";

async function main() {
  const untisHost = readline.question(
    "Wie ist die WebUntis URL? (z.B. mese.webuntis.com): "
  );
  if (!untisHost) {
    return console.log("Es wurde keine WebUntis URL angegeben");
  }

  const school = readline.question("Wie ist der Name deiner Schule?: ");
  if (!school) {
    return console.log("Es wurde kein Schulname angegeben");
  }

  const username = readline.question("Wie ist dein WebUntis Username?: ");
  if (!username) {
    return console.log("Es wurde kein Username angegeben");
  }

  const password = readline.question("Wie ist dein WebUntis Passwort?: ", {
    hideEchoBack: true,
  });
  if (!password) {
    return console.log("Es wurde kein Password angegeben");
  }

  const untis = new WebUntis(school, username, password, untisHost);

  const startDate = readline.question(
    "Von welchem Datum möchtest du die Daten abfragen? (Format: YYYY-MM-DD): "
  );
  if (!startDate) {
    return console.log("Es wurde kein Startdatum angegeben");
  }

  const endDate = readline.question(
    "Bis zu welchem Datum möchtest du die Daten abfragen? (Format: YYYY-MM-DD): "
  );
  if (!endDate) {
    return console.log("Es wurde kein Enddatum angegeben");
  }

  const useProxy = readline.question(
    "Möchtest du einen Proxy verwenden? (y/n): "
  );
  if (useProxy === "y") {
    const proxy = readline.question("Wie ist die Proxy URL?: ");
    if (!proxy) {
      return console.log("Es wurde kein Proxy angegeben");
    }

    untis.axios.defaults.proxy = false;
    untis.axios.defaults.httpsAgent = new HttpsProxyAgent(
      proxy.startsWith("http") ? proxy : `http://${proxy}`
    );
  }

  const loginData = await untis.login();

  const jwt = await untis._getJWT();

  const startDateRage = new Date(startDate);
  const endDateRage = new Date(endDate);
  const datesBetween = (startDate: Date, endDate: Date) => {
    const dates = [];
    let currentDate = startDate;
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
  };

  const dates = datesBetween(startDateRage, endDateRage);

  const template = new Map<Date, string[]>();

  for (const date of dates) {
    const startDateString = new Date(date.setHours(Math.floor(8), 0))
      .toISOString()
      .split(".")[0];
    const endDateString = new Date(date.setHours(Math.floor(23), 59))
      .toISOString()
      .split(".")[0];

    const url = `https://mese.webuntis.com/WebUntis/api/rest/view/v2/calendar-entry/detail?elementId=21905&elementType=5&endDateTime=${endDateString}&homeworkOption=DUE&startDateTime=${startDateString}`;
    const details = await untis.axios.get(url, {
      headers: {
        Cookie: `JSESSIONID=${loginData.sessionId}; schoolname=${untis.schoolbase64}`,
        Authorization: `Bearer ${jwt}`,
      },
    });

    if (!template.has(date)) {
      template.set(date, []);
    }

    for (const entry of details.data.calendarEntries) {
      template
        .get(date)
        ?.push(`${entry.subject.displayName}: ${entry.teachingContent ?? "-"}`);
    }
  }

  let text = "";
  for (const [date, lessons] of template) {
    const day = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"][
      date.getDay() - 1
    ];

    const humanReadableDate = `${date.getDate().toString().padStart(2, "0")}.${(
      date.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}.${date.getFullYear()}`;
    text += `${day} (${humanReadableDate}):\n`;
    for (const lesson of lessons) {
      text += `   ${lesson}\n`;
    }

    text += "\n";
  }

  console.log("\nAusgabe:");
  console.log(text);
}

main();
