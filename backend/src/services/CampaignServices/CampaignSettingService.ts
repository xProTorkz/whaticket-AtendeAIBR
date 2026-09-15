import CampaignSetting from "../../models/CampaignSetting";

export const getCampaignSettings = async (
  companyId: number
): Promise<Array<{ key: string; value: string }>> => {
  const settings = await CampaignSetting.findAll({
    where: { companyId }
  });

  return settings.map(s => ({
    key: s.key,
    value: s.value
  }));
};

export const saveCampaignSettings = async (
  companyId: number,
  settingsObject: Record<string, any>
): Promise<void> => {
  for (const [key, value] of Object.entries(settingsObject)) {
    const stringValue = typeof value === "string" ? value : JSON.stringify(value);

    const [setting, created] = await CampaignSetting.findOrCreate({
      where: { companyId, key },
      defaults: {
        companyId,
        key,
        value: stringValue
      }
    });

    if (!created) {
      await setting.update({ value: stringValue });
    }
  }
};
