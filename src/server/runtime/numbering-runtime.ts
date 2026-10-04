import type { NumberingSetting } from "./operational-seeds.ts";

export interface NumberingRuntimeDependencies {
  settings: NumberingSetting[];
  nextEntityId: (prefix: string) => string;
}

export function createNumberingRuntime(deps: NumberingRuntimeDependencies) {
  function getNextNumber(entity: string): string {
    const setting = deps.settings.find((candidate) => candidate.entity === entity);
    if (!setting) {
      const defaultSetting: NumberingSetting = {
        id: deps.nextEntityId("num"),
        entity,
        prefix: entity.toUpperCase().slice(0, 3),
        suffix: "",
        digits: 6,
        separator: "-",
        nextNumber: 1,
      };
      deps.settings.push(defaultSetting);
      const num = `${defaultSetting.prefix}${defaultSetting.separator}${String(defaultSetting.nextNumber).padStart(defaultSetting.digits, "0")}`;
      defaultSetting.nextNumber += 1;
      return num;
    }

    const separator = setting.separator || "-";
    const num = `${setting.prefix}${separator}${String(setting.nextNumber).padStart(setting.digits, "0")}${setting.suffix ? separator + setting.suffix : ""}`;
    setting.nextNumber += 1;
    return num;
  }

  return { getNextNumber };
}
