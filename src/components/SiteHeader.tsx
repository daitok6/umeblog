import Link from "next/link";

export default function SiteHeader({ title }: { title: string }) {
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link href="/" className="site-header__logo">
          {title}
        </Link>
        <nav className="site-header__nav">
          <Link className="nav-link" href="/">
            Blog
          </Link>
          <Link className="nav-link" href="/tags">
            Tags
          </Link>
          <Link className="nav-link" href="/about">
            About
          </Link>
        </nav>
      </div>
    </header>
  );
}
