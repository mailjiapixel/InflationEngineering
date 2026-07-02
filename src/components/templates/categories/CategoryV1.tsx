'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Plus } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

import { cn } from '@/lib/utils';

interface Category {
  _id: string;
  name: string;
  slug: string;
  image?: string;
}

interface CategoryShowcaseProps {
  categories: Category[];
}

export default function CategoryV1({ categories }: CategoryShowcaseProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const canScroll = categories.length > 6;

  // Initialize Embla Carousel with Autoplay and Full Slide Grouping
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: canScroll,
      align: canScroll ? 'start' : 'center',
      slidesToScroll: 'auto',
      watchDrag: canScroll,
    },
    canScroll ? [Autoplay({ delay: 4000, stopOnInteraction: false, stopOnMouseEnter: true })] : []
  );

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  const scrollTo = useCallback((index: number) => {
    if (emblaApi) emblaApi.scrollTo(index);
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);

    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  if (!categories || categories.length === 0) return null;

  return (
    <section className="bg-muted/30 py-12 overflow-hidden">
      <div className="container px-4 mx-auto">
        <div className="flex flex-col items-center justify-center text-center space-y-4 mb-10">
          <h2 className="text-2xl font-bold tracking-tighter md:text-4xl text-foreground">
            Browse by Category
          </h2>

        </div>

        {/* Embla Carousel Viewport */}
        <div className="relative">
          <div className="overflow-hidden cursor-grab active:cursor-grabbing" ref={emblaRef}>
            <div className={cn(
              "flex -ml-4",
              !canScroll && "lg:justify-center",
              categories.length < 4 && "md:justify-center"
            )}>
              {categories.map((category) => (
                <div
                  key={category._id}
                  className="flex-[0_0_33.33%] min-w-0 pl-4 md:flex-[0_0_25%] lg:flex-[0_0_16.66%] xl:flex-[0_0_14.28%]"
                >
                  <Link
                    href={`/shop?category=${encodeURIComponent(category.slug)}`}
                    className="group block"
                  >
                    <div className="flex flex-col items-center gap-3 py-2 transition-all hover:-translate-y-1">
                      <div className="h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24 overflow-hidden rounded-full bg-background border border-muted shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        {category.image ? (
                          <Image
                            src={category.image}
                            alt={category.name}
                            width={96}
                            height={96}
                            className="h-full w-full object-cover"
                            sizes="(max-width: 640px) 64px, (max-width: 1024px) 80px, 96px"
                          />
                        ) : (
                          <Plus className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <h3 className="font-semibold text-xs sm:text-sm group-hover:text-primary transition-colors text-center line-clamp-2">
                        {category.name}
                      </h3>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Pagination Dots */}
          {canScroll && (
            <div className="flex justify-center items-center gap-2 mt-8">
              {scrollSnaps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => scrollTo(index)}
                  className={`transition-all duration-300 cursor-pointer rounded-full ${index === selectedIndex
                    ? "w-8 bg-primary h-1.5"
                    : "w-2 bg-muted-foreground/30 h-1.5 hover:bg-muted-foreground/50"
                    }`}
                  aria-label={`Go to slide group ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

