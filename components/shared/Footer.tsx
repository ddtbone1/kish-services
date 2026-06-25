import Link from "next/link";

export const Footer = () => {
  return (
    <footer className="w-full bg-[#111] text-white px-6 md:px-16 pt-24 pb-12">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12 mb-24">
          {/* Contact Us */}
          <div className="flex flex-col gap-6">
            <h3 className="text-xl font-medium">Contact Us</h3>
            <div className="flex flex-col gap-3 text-white/60 text-sm leading-relaxed">
              <p>
                123 Detailing Ave, Suite 101<br />
                San Francisco, CA 94103
              </p>
              <p>hello@kishdetailing.com</p>
              <p>+1 (555) 000-0000</p>
            </div>
          </div>

          {/* Our Service */}
          <div className="flex flex-col gap-6">
            <h3 className="text-xl font-medium">Our Service</h3>
            <div className="flex flex-col gap-3 text-white/60 text-sm">
              <Link href="#services" className="hover:text-accent transition-colors">Express Wash</Link>
              <Link href="#services" className="hover:text-accent transition-colors">Full-Service Clean</Link>
              <Link href="#services" className="hover:text-accent transition-colors">Interior Deep Clean</Link>
              <Link href="#services" className="hover:text-accent transition-colors">Premium Wax & Polish</Link>
            </div>
          </div>

          {/* Kish */}
          <div className="flex flex-col gap-6">
            <h3 className="text-xl font-medium">Kish</h3>
            <div className="flex flex-col gap-3 text-white/60 text-sm">
              <Link href="/about" className="hover:text-accent transition-colors">About us</Link>
              <Link href="/faq" className="hover:text-accent transition-colors">FAQ</Link>
              <Link href="/news" className="hover:text-accent transition-colors">News</Link>
              <Link href="/contact" className="hover:text-accent transition-colors">Contact us</Link>
              <Link href="/privacy" className="hover:text-accent transition-colors">Privacy & cookies</Link>
            </div>
          </div>

          {/* Franchise */}
          <div className="flex flex-col gap-6">
            <h3 className="text-xl font-medium">Franchise</h3>
            <div className="flex flex-col gap-3 text-white/60 text-sm">
              <Link href="/sustainability" className="hover:text-accent transition-colors">Sustainability</Link>
              <Link href="/franchise" className="hover:text-accent transition-colors">Franchise Opportunities</Link>
              <Link href="/careers" className="hover:text-accent transition-colors">Careers</Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col items-center gap-16 border-t border-white/10 pt-12">
          <p className="text-sm text-white/40 tracking-wider">
            © {new Date().getFullYear()} KISH DETAILING — All rights reserved
          </p>
          
          <div className="w-full text-center py-8">
            <h1 className="text-[15vw] md:text-[20vw] font-light leading-none tracking-[-0.05em] text-white/10 select-none uppercase">
                Kish
            </h1>
          </div>
        </div>
      </div>
    </footer>
  );
};
