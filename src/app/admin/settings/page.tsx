import { getSettings } from "@/lib/repo/settings";
import { saveSettingsAction } from "@/app/actions/settings";
import { requireAuthor } from "@/lib/auth/session";
import { listWithCounts } from "@/lib/repo/tags";
import { parseRails } from "@/lib/rails";
import RailsEditor from "@/components/admin/RailsEditor";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireAuthor();
  const [s, tags] = await Promise.all([getSettings(), listWithCounts()]);

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

        <label className="label" htmlFor="bannerTitleMobile">
          バナー名（スマホ）
        </label>
        <input
          id="bannerTitleMobile"
          name="bannerTitleMobile"
          defaultValue={s.bannerTitleMobile}
          maxLength={60}
          placeholder={s.bannerTitle || s.title}
        />
        <p className="label" style={{ marginTop: "-8px" }}>
          空欄のときはデスクトップと同じものを表示します
        </p>

        <label className="label" htmlFor="title">
          サイト名
        </label>
        <input id="title" name="title" defaultValue={s.title} maxLength={60} />

        <label className="label" htmlFor="titleMobile">
          サイト名（スマホ）
        </label>
        <input
          id="titleMobile"
          name="titleMobile"
          defaultValue={s.titleMobile}
          maxLength={60}
          placeholder={s.title}
        />
        <p className="label" style={{ marginTop: "-8px" }}>
          画面表示だけが変わります。RSS や検索結果はサイト名のままです
        </p>

        <label className="label" htmlFor="tagline">
          ひとこと
        </label>
        <input id="tagline" name="tagline" defaultValue={s.tagline} maxLength={120} />

        <label className="label" htmlFor="aboutMd">
          About のテキスト
        </label>
        <textarea id="aboutMd" name="aboutMd" defaultValue={s.aboutMd} maxLength={4000} />

        <label className="label" style={{ marginTop: "8px" }}>
          トップページの棚
        </label>
        <RailsEditor defaultRails={parseRails(s.railsJson)} tags={tags} />

        <button className="btn" type="submit" style={{ alignSelf: "flex-start" }}>
          保存する
        </button>
      </form>
    </div>
  );
}
