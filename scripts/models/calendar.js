const uuid = require("uuid/v1");

class CalendarMap {
  static inRobot(robot) {
    if (!this.instance || this.instance.robot !== robot) {
      this.instance = new CalendarMap(robot);
    }
    return this.instance;
  }

  constructor(robot) {
    this.robot = robot;
    this.calendars = new Map(robot.brain.get("hubot-plan:ical") || []);
  }

  getCalendar(userId, userTz) {
    let existing = this.calendars.get(userId);
    if (!existing) {
      const calendarId = uuid();
      this.calendars.set(userId, {calendarId, userTz});
      this.robot.brain.set("hubot-plan:ical", Array.from(this.calendars));
      return calendarId;
    } else if (existing.userTz !== userTz) {
      this.calendars.set(userId, {calendarId: existing.calendarId, userTz});
      this.robot.brain.set("hubot-plan:ical", Array.from(this.calendars));
      return existing.calendarId;
    } else {
      return existing.calendarId;
    }
  }

  isValid(calendarId) {
    for (const existing of this.calendars.values()) {
      if (existing.calendarId === calendarId) {
        return true;
      }
    }
    return false;
  }
}

module.exports = {
  CalendarMap,
};
