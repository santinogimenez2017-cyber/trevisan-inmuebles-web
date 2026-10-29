import { HeroSection } from '@/components/hero/HeroSection';
import { FeaturedSection } from '@/components/sections/FeaturedSection';
import { CategoriesSection } from '@/components/sections/CategoriesSection';
import { ArchTourSection } from '@/components/sections/ArchTourSection';
import { AboutSection } from '@/components/sections/AboutSection';
import { ContactSection } from '@/components/sections/ContactSection';

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <FeaturedSection />
      <CategoriesSection />
      <ArchTourSection />
      <AboutSection />
      <ContactSection />
    </main>
  );
}
