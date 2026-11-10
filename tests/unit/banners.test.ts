/**
 * 节日横幅配置解析（vite-plugin-banners）单元测试。
 */
import { describe, expect, it } from "vitest";
import { parseBannersToml } from "../../vite-plugin-banners";

describe("parseBannersToml", () => {
  it("解析完整横幅：固定日期范围型", () => {
    const banners = parseBannersToml(`
[[banners]]
id = "labor-day"
egg = "cn_labor_day"
cssClass = "egg-labor-day"
name = "劳动人民万岁"
start = "05-01"
end = "05-05"
`);
    expect(banners).toEqual([
      {
        id: "labor-day",
        egg: "cn_labor_day",
        cssClass: "egg-labor-day",
        name: "劳动人民万岁",
        start: "05-01",
        end: "05-05",
      },
    ]);
  });

  it("解析农历型横幅：lunar + api", () => {
    const banners = parseBannersToml(`
[[banners]]
id = "mid-autumn"
egg = "cn_mid_autumn"
cssClass = "egg-mid-autumn"
name = "中秋快乐"
lunar = "八月十五"
api = "https://data.weather.gov.hk/weatherAPI/opendata/lunardate.php"
`);
    expect(banners[0].lunar).toBe("八月十五");
    expect(banners[0].api).toBe("https://data.weather.gov.hk/weatherAPI/opendata/lunardate.php");
  });

  it("无日期范围且非农历时抛错", () => {
    expect(() =>
      parseBannersToml(`
[[banners]]
id = "x"
egg = "egg_x"
cssClass = "egg-x"
name = "X"
`),
    ).toThrow(/日期范围|lunar/);
  });

  it("农历型缺少 api 抛错", () => {
    expect(() =>
      parseBannersToml(`
[[banners]]
id = "mid-autumn"
egg = "cn_mid_autumn"
cssClass = "egg-mid-autumn"
name = "中秋快乐"
lunar = "八月十五"
`),
    ).toThrow(/api/);
  });

  it("id 重复抛错", () => {
    expect(() =>
      parseBannersToml(`
[[banners]]
id = "x"
egg = "egg_x"
cssClass = "egg-x"
name = "X"
start = "01-01"
end = "01-02"

[[banners]]
id = "x"
egg = "egg_x"
cssClass = "egg-x"
name = "X"
start = "01-01"
end = "01-02"
`),
    ).toThrow(/重复/);
  });
});
