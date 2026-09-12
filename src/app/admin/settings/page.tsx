import { getSettings } from "@/lib/repo/settings";
import { saveSettingsAction } from "@/app/actions/settings";
import { requireAuthor } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireAuthor();
  const s = await getSettings();

  return (
    <div>
      <div className="page-head">
        <h1>設定</h1>
      </div>

      <form action={saveSettingsAction} className="settings-form">
        <label className="label" htmlFor="bannerTitle">
          バナー名
        </label>
        <input
          id="bannerTitle"
          name="bannerTitle"
          defaultValue={s.bannerTitle}
          maxLength={60}
          placeholder={s.title}
        />
        <p className="label" style={{ marginTop: "-8px" }}>
          空欄のときはサイト名を表示します
        </p>

        <label className="label" htmlFor="title">
          サイト名
        </label>
        <input id="title" name="title" defaultValue={s.title} maxLength={60} />

        <label className="label" htmlFor="tagline">
          ひとこと
        </label>
        <input id="tagline" name="tagline" defaultValue={s.tagline} maxLength={120} />

        <label className="label" htmlFor="aboutMd">
          About のテキスト
        </label>
        <textarea id="aboutMd" name="aboutMd" defaultValue={s.aboutMd} maxLength={4000} />

        <button className="btn" type="submit" style={{ alignSelf: "flex-start" }}>
          保存する
        </button>
      </form>
    </div>
  );
}
