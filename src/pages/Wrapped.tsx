import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useDataStore } from '../stores/dataStore';
import { useNavigate } from 'react-router-dom';
import { convertToINR } from '../utils/categoryUtils';
import { filterTransactionsByYear, filterActivitiesByYear } from '../utils/dateUtils';
import NoDataRedirect from '../components/NoDataRedirect';
import { animate as anime } from 'animejs';
import { bgMusic } from '../utils/backgroundMusic';
import styles from './Wrapped.module.css';

interface SlideData {
  id: string;
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  bgColor: string;
  bgImage?: string; // Path to background gradient image (added after slide generation)
  detail?: string;
}


const getCategoryIcon = (category: string): string => {
  const icons: Record<string, string> = {
    Food: '🍕',
    Groceries: '🛒',
    Clothing: '👕',
    Entertainment: '🎬',
    'E-commerce': '🛍️',
    'Travel & Transport': '🚗',
    'Utilities & Bills': '💡',
    Healthcare: '🏥',
    Education: '📚',
    Investments: '📈',
    Transfers: '💸',
    'Bank Transfers': '🏦',
    Others: '📦',
  };
  return icons[category] || '📊';
};

// Background gradient images
const BG_IMAGES = {
  INTRO_OUTRO: '/bg/codioful-formerly-gradienta-7E5kq_sW0Ew-unsplash.jpg', // Used for first and last slide
  OTHERS: [
    '/bg/codioful-formerly-gradienta-Mx688PpeE2A-unsplash.jpg',
    '/bg/dave-hoefler-PEkfSAxeplg-unsplash.jpg',
    '/bg/luke-chesser-CxBx_J3yp9g-unsplash.jpg',
    '/bg/mymind-wHJ5L9KGTl4-unsplash.jpg',
  ]
};

// Assign background images to slides
const assignBackgroundImage = (_slideId: string, slideIndex: number, totalSlides: number): string => {
  // First and last slides get the intro/outro image
  if (slideIndex === 0 || slideIndex === totalSlides - 1) {
    return BG_IMAGES.INTRO_OUTRO;
  }

  // For other slides, cycle through the 4 available backgrounds
  const bgIndex = (slideIndex - 1) % BG_IMAGES.OTHERS.length;
  return BG_IMAGES.OTHERS[bgIndex];
};

export default function Wrapped() {
  const navigate = useNavigate();
  const { parsedData, insights, filterContext } = useDataStore();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isSharing, setIsSharing] = useState(false);
  const slideRef = useRef<HTMLDivElement>(null);

  // Generate slides from insights and data
  const slides: SlideData[] = useMemo(() => {
    if (!parsedData) return [];

    const filteredTransactions = filterTransactionsByYear(parsedData.transactions, filterContext.year);
    const filteredActivities = filterActivitiesByYear(parsedData.activities, filterContext.year);

    // Calculate total spent
    const totalSpent = filteredTransactions.reduce((sum, t) => sum + convertToINR(t.amount), 0) +
      filteredActivities
        .filter(a => a.amount && (a.transactionType === 'sent' || a.transactionType === 'paid'))
        .reduce((sum, a) => sum + convertToINR(a.amount!), 0);

    const formatAmount = (amount: number) => {
      if (amount >= 100000) return `${(amount / 100000).toFixed(1)}L`;
      if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
      return Math.round(amount).toLocaleString();
    };

    const generatedSlides: SlideData[] = [
      // Intro slide
      {
        id: 'intro',
        title: 'Your FinnLens',
        value: filterContext.year === 'all' ? 'All Time' : filterContext.year,
        subtitle: 'Wrapped',
        icon: '🎉',
        bgColor: '#8338ec'
      },
      // Total spent
      {
        id: 'total',
        title: 'You spent a total of',
        value: `₹${formatAmount(totalSpent)}`,
        subtitle: `across ${filteredActivities.length + filteredTransactions.length} transactions`,
        icon: '💸',
        bgColor: '#d6249f'
      },
    ];

    // Add insight-based slides
    insights.forEach(insight => {
      switch (insight.type) {
        case 'money_flow': {
          const data = insight.data as any;
          generatedSlides.push({
            id: 'money_flow',
            title: data.flowDirection === 'giver' ? 'The Generous One' :
              data.flowDirection === 'receiver' ? 'Money Magnet' : 'Balanced Flow',
            value: `₹${formatAmount(data.totalSent.value)}`,
            subtitle: `sent to friends & family`,
            icon: data.flowDirection === 'giver' ? '🎁' : data.flowDirection === 'receiver' ? '🧲' : '⚖️',
            bgColor: '#FE5196',
            detail: `Received ₹${formatAmount(data.totalReceived.value)} back`,
          });
          break;
        }
        case 'spending_category': {
          const data = insight.data as any;
          generatedSlides.push({
            id: 'top_category',
            title: 'Your top spending was',
            value: data.topCategory,
            subtitle: `₹${formatAmount(data.topCategoryAmount.value)} spent`,
            icon: getCategoryIcon(data.topCategory),
            bgColor: '#ff6b9d',
            detail: `${data.topCategoryCount} transactions`,
          });
          break;
        }
        case 'peak_activity': {
          const data = insight.data as any;
          generatedSlides.push({
            id: 'peak_time',
            title: 'Your peak payment time',
            value: `${data.peakDay}s`,
            subtitle: `at ${data.peakHour}:00`,
            icon: data.nightOwlScore > 30 ? '🦉' : '☀️',
            bgColor: '#fc8bff',
            detail: data.nightOwlScore > 30 ? `${data.nightOwlScore}% payments after 10pm` : undefined,
          });
          break;
        }
        case 'transaction_partner': {
          const data = insight.data as any;
          if (data.mostFrequentPartner) {
            generatedSlides.push({
              id: 'transaction_partner',
              title: 'Your top payment partner',
              value: data.mostFrequentPartner,
              subtitle: `₹${formatAmount(data.totalAmount.value)}`,
              icon: '👤',
              bgColor: '#3a47d5',
              detail: `${data.transactionCount} transactions`,
            });
          }
          break;
        }
        case 'expensive_day': {
          const data = insight.data as any;
          const date = new Date(data.date);
          generatedSlides.push({
            id: 'expensive_day',
            title: 'Your biggest spending day',
            value: date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
            subtitle: `₹${formatAmount(data.amount)} spent`,
            icon: '📅',
            bgColor: '#DC2626', // Dark red
          });
          break;
        }
        case 'domain_collector': {
          const data = insight.data as any;
          generatedSlides.push({
            id: 'domain_collector',
            title: 'The Domain Collector',
            value: `${data.totalDomains}`,
            subtitle: `domains purchased`,
            icon: '🌐',
            bgColor: '#8B5CF6', // Purple
            detail: data.mostRenewed ? `Most renewed: ${data.mostRenewed}` : undefined,
          });
          break;
        }
        case 'group_champion': {
          const data = insight.data as any;
          generatedSlides.push({
            id: 'group_champion',
            title: 'Group Expense Champion',
            value: `${data.reliabilityScore}%`,
            subtitle: 'reliability score',
            icon: '🏆',
            bgColor: '#F59E0B', // Amber
            detail: `Paid ${data.paidCount}/${data.totalCount} splits`,
          });
          break;
        }
        case 'voucher_hoarder': {
          const data = insight.data as any;
          generatedSlides.push({
            id: 'voucher_hoarder',
            title: 'Voucher Collector',
            value: `${data.totalVouchers}`,
            subtitle: 'vouchers earned',
            icon: '🎁',
            bgColor: '#E11D48', // Rose
            detail: data.expired > 0 ? `${data.expired} expired (${data.wastePercentage}%)` : undefined,
          });
          break;
        }
        case 'spending_timeline': {
          const data = insight.data as any;
          const firstDate = new Date(data.firstDate);
          generatedSlides.push({
            id: 'spending_timeline',
            title: 'Payment Journey',
            value: data.yearsSince,
            subtitle: 'years of transactions',
            icon: '📅',
            bgColor: '#059669', // Green
            detail: `Since ${firstDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`,
          });
          break;
        }
        case 'split_partner': {
          const data = insight.data as any;
          generatedSlides.push({
            id: 'split_partner',
            title: 'Your Split Partner',
            value: data.partnerName,
            subtitle: `${data.splitCount} splits together`,
            icon: '🤝',
            bgColor: '#6366F1', // Indigo
          });
          break;
        }
        case 'reward_hunter': {
          const data = insight.data as any;
          generatedSlides.push({
            id: 'reward_hunter',
            title: 'Cashback Hunter',
            value: `₹${formatAmount(data.totalRewards)}`,
            subtitle: 'cashback earned',
            icon: '🎯',
            bgColor: '#10B981', // Green
            detail: `${data.rewardCount} rewards`,
          });
          break;
        }
        case 'responsible_one': {
          const data = insight.data as any;
          generatedSlides.push({
            id: 'responsible_one',
            title: 'The Responsible One',
            value: `${data.createdCount}`,
            subtitle: 'group expenses created',
            icon: '👨‍👩‍👧‍👦',
            bgColor: '#D97706', // Dark amber
            detail: `Total: ₹${formatAmount(data.totalAmount)}`,
          });
          break;
        }
        case 'money_network': {
          const data = insight.data as any;
          generatedSlides.push({
            id: 'money_network',
            title: 'Your Money Network',
            value: `${data.peopleCount}`,
            subtitle: 'people in your circle',
            icon: '👥',
            bgColor: '#8B5CF6', // Purple
            detail: `${data.groupCount} groups`,
          });
          break;
        }
        case 'bulk_payment': {
          const data = insight.data as any;
          generatedSlides.push({
            id: 'bulk_payment',
            title: 'Payment Velocity',
            value: `${data.maxTransactionsInDay}`,
            subtitle: 'transactions in one day',
            icon: '⚡',
            bgColor: '#DC2626', // Red
            detail: `${data.maxTransactionsInHour} in one hour`,
          });
          break;
        }
        case 'payment_streak': {
          const data = insight.data as any;
          generatedSlides.push({
            id: 'payment_streak',
            title: 'Payment Streak',
            value: `${data.longestStreak} days`,
            subtitle: 'longest streak',
            icon: '🔥',
            bgColor: '#EF4444', // Red
          });
          break;
        }
        case 'midnight_shopper': {
          const data = insight.data as any;
          generatedSlides.push({
            id: 'midnight_shopper',
            title: 'Night Owl',
            value: `${data.lateNightCount}`,
            subtitle: 'late night payments',
            icon: '🌙',
            bgColor: '#3B82F6', // Blue
            detail: `Latest: ${data.latestHour}:00`,
          });
          break;
        }
        case 'smallest_payment': {
          const data = insight.data as any;
          generatedSlides.push({
            id: 'smallest_payment',
            title: 'Every Payment Counts',
            value: `₹${data.amount.value}`,
            subtitle: 'smallest payment',
            icon: '🪙',
            bgColor: '#14B8A6', // Teal
            detail: data.description,
          });
          break;
        }
        case 'round_number_obsession': {
          const data = insight.data as any;
          generatedSlides.push({
            id: 'round_number',
            title: 'Round Number Lover',
            value: `${data.roundPercentage}%`,
            subtitle: 'payments in round numbers',
            icon: '💯',
            bgColor: '#D946EF', // Fuchsia
            detail: `Favorite: ₹${data.favoriteRoundNumber}`,
          });
          break;
        }
      }
    });

    // Outro slide
    generatedSlides.push({
      id: 'outro',
      title: "That's your",
      value: 'FinnLens',
      subtitle: filterContext.year === 'all' ? 'All Time' : filterContext.year,
      icon: '✨',
      bgColor: '#8B5CF6', // Purple
      detail: 'Share with friends!',
    });

    // Assign background images to all slides
    const totalSlides = generatedSlides.length;
    const slidesWithBg = generatedSlides.map((slide, index) => ({
      ...slide,
      bgImage: assignBackgroundImage(slide.id, index, totalSlides)
    }));

    return slidesWithBg;
  }, [parsedData, insights, filterContext.year]);

  const nextSlide = useCallback(() => {
    setCurrentSlide(prev => {
      const next = (prev + 1) % slides.length;
      // Animate transition
      if (slideRef.current) {
        anime(slideRef.current, {
          scale: [0.95, 1],
          opacity: [0, 1],
          duration: 300,
          ease: 'out(3)',
        });
      }
      return next;
    });
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide(prev => {
      const previous = (prev - 1 + slides.length) % slides.length;
      // Animate transition
      if (slideRef.current) {
        anime(slideRef.current, {
          scale: [0.95, 1],
          opacity: [0, 1],
          duration: 300,
          ease: 'out(3)',
        });
      }
      return previous;
    });
  }, [slides.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        prevSlide();
      } else if (e.key === 'ArrowRight') {
        nextSlide();
      } else if (e.key === 'Escape') {
        bgMusic.pause();
        navigate('/insights');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide, navigate]);

  // Initialize and play background music
  useEffect(() => {
    // Initialize music manager
    bgMusic.initialize();

    // Start playing after a short delay
    const timer = setTimeout(() => {
      bgMusic.play();
    }, 500);

    return () => {
      clearTimeout(timer);
      // Pause music when leaving the page
      bgMusic.pause();
    };
  }, []);


  // Entrance animation
  useEffect(() => {
    if (slideRef.current) {
      anime(slideRef.current, {
        scale: [0.9, 1],
        opacity: [0, 1],
        duration: 500,
        ease: 'out(3)',
      });
    }
  }, [currentSlide]);

  const shareSlide = useCallback(async () => {
    if (!slideRef.current || !slide.bgImage) return;

    setIsSharing(true);

    // Add class to disable animations during export
    const slideElement = slideRef.current;
    slideElement.classList.add(styles.exportingSlide);

    try {
      // Wait for animations to stop
      await new Promise(resolve => setTimeout(resolve, 50));

      // Canvas dimensions (9:16 aspect ratio for social media)
      const canvasWidth = 1080;
      const canvasHeight = 1920;

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Load and draw background image
      const bgImg = new Image();
      bgImg.crossOrigin = 'anonymous';

      await new Promise((resolve, reject) => {
        bgImg.onload = resolve;
        bgImg.onerror = reject;
        bgImg.src = slide.bgImage!;
      });

      // Draw background image
      ctx.drawImage(bgImg, 0, 0, canvasWidth, canvasHeight);

      // Calculate vertical center
      const centerY = canvasHeight / 2;

      // Set up default text styling
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';

      // Draw icon (emoji) - matching text-7xl (~112px)
      ctx.font = '220px "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", Arial';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;
      ctx.fillText(slide.icon, canvasWidth / 2, centerY - 280);

      // Draw title - matching text-lg font-bold (~18px → 48px scaled)
      ctx.font = '700 52px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;
      ctx.fillText(slide.title, canvasWidth / 2, centerY - 80);

      // Draw value (main text) - matching 3.2rem font-weight-900 (~51px → 140px scaled)
      ctx.font = '900 140px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;

      // Handle multi-line text if value is too long
      const maxWidth = canvasWidth * 0.9;
      const words = slide.value.split(' ');
      let line = '';
      let y = centerY + 60;

      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && i > 0) {
          ctx.fillText(line, canvasWidth / 2, y);
          line = words[i] + ' ';
          y += 150;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, canvasWidth / 2, y);

      // Draw subtitle - matching text-base font-600 (~16px → 44px scaled)
      const subtitleY = y + 100;
      ctx.font = '600 44px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
      ctx.shadowBlur = 10;
      ctx.fillText(slide.subtitle, canvasWidth / 2, subtitleY);

      // Draw detail if exists - matching 15px font-600 (~40px scaled)
      if (slide.detail) {
        ctx.font = '600 38px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.shadowBlur = 8;
        ctx.fillText(slide.detail, canvasWidth / 2, subtitleY + 80);
      }

      // Draw watermark at bottom - matching text-xs font-medium (~12px → 32px scaled)
      ctx.font = '500 32px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.shadowBlur = 8;
      ctx.fillText('finnlens.com', canvasWidth / 2, canvasHeight - 80);

      // Convert to blob and share or download
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const file = new File([blob], `finnlens-${slides[currentSlide].id}.png`, {
          type: 'image/png',
        });

        // Try native share if available
        if (navigator.share && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'My FinnLens',
              text: 'Check out my FinnLens!',
            });
          } catch (err) {
            // User cancelled or error, fallback to download
            downloadImage(canvas);
          }
        } else {
          // Fallback to download
          downloadImage(canvas);
        }
      }, 'image/png');
    } catch (error) {
      console.error('Error sharing:', error);
    } finally {
      // Remove the export class to re-enable animations
      slideElement.classList.remove(styles.exportingSlide);
      setIsSharing(false);
    }
  }, [currentSlide, slides]);

  const downloadImage = (canvas: HTMLCanvasElement) => {
    const link = document.createElement('a');
    link.download = `finnlens-${slides[currentSlide].id}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  if (!parsedData || slides.length === 0) {
    return <NoDataRedirect />;
  }

  const slide = slides[currentSlide];

  return (
    <div className={styles.wrapped}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>FinnLens {filterContext.year === 'all' ? 'All Time' : filterContext.year}</h1>
      </div>

      {/* Progress bar */}
      <div className={styles.progressBar}>
        {slides.map((_, index) => (
          <div
            key={index}
            className={`${styles.progressSegment} ${index <= currentSlide ? styles.active : ''}`}
            onClick={() => setCurrentSlide(index)}
          />
        ))}
      </div>

      {/* Main slide area */}
      <div className={styles.slideContainer}>
        {/* Left navigation arrow */}
        <button
          className={`${styles.navArrow} ${styles.navArrowLeft}`}
          onClick={prevSlide}
          aria-label="Previous slide"
          disabled={currentSlide === 0}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>

        <div className={styles.slideWrapper}>
          <div
            ref={slideRef}
            className={styles.slide}
            style={{
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Background image as actual img element for reliable html2canvas capture */}
            {slide.bgImage && (
              <img
                src={slide.bgImage}
                alt=""
                className={styles.slideBackgroundImage}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center',
                  zIndex: 0
                }}
              />
            )}

            {/* Decorative animated elements - only visible in browser */}
            <div className={styles.decorativeElements}>
              {/* Floating particles */}
              <div className={styles.particlesLayer}>
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className={styles.floatingParticle}
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 5}s`,
                      animationDuration: `${8 + Math.random() * 8}s`,
                    }}
                  />
                ))}
              </div>

              {/* Blob shapes */}
              <div className={styles.blobsLayer}>
                <div className={styles.decorativeBlob1} style={{ background: `${slide.bgColor}40` }} />
                <div className={styles.decorativeBlob2} style={{ background: `${slide.bgColor}30` }} />
              </div>

              {/* Sparkles/stars */}
              <div className={styles.sparklesLayer}>
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className={styles.sparkle}
                    style={{
                      left: `${10 + Math.random() * 80}%`,
                      top: `${10 + Math.random() * 80}%`,
                      animationDelay: `${Math.random() * 3}s`,
                    }}
                  >
                    ✨
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.slideContent}>
              <div className={styles.slideIcon}>{slide.icon}</div>
              <h2 className={styles.slideTitle}>{slide.title}</h2>
              <div className={styles.slideValue}>{slide.value}</div>
              <p className={styles.slideSubtitle}>{slide.subtitle}</p>
              {slide.detail && <p className={styles.slideDetail}>{slide.detail}</p>}

              {/* Celebration burst removed */}

              <div className={styles.watermark}>finnlens.com</div>
            </div>
          </div>

          {/* Share button overlay - redesigned */}
          <button
            className={styles.shareButton}
            onClick={(e) => {
              e.stopPropagation();
              shareSlide();
            }}
            disabled={isSharing}
            aria-label="Share or download slide"
            data-share-button="true"
            title="Share or download"
          >
            {isSharing ? (
              <div className={styles.shareButtonLoading}>
                <div className={styles.spinner}></div>
              </div>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                <polyline points="16 6 12 2 8 6"></polyline>
                <line x1="12" y1="2" x2="12" y2="15"></line>
              </svg>
            )}
          </button>
        </div>

        {/* Right navigation arrow */}
        <button
          className={`${styles.navArrow} ${styles.navArrowRight}`}
          onClick={nextSlide}
          aria-label="Next slide"
          disabled={currentSlide === slides.length - 1}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>

      {/* Navigation hints with counter */}
      <div className={styles.navHints}>
        <span className={styles.navHint}>
          <kbd className={styles.kbd}>←</kbd> Previous
        </span>
        <span className={styles.slideCounter}>{currentSlide + 1} / {slides.length}</span>
        <span className={styles.navHint}>
          Next <kbd className={styles.kbd}>→</kbd>
        </span>
      </div>

      {/* Action buttons */}
      <div className={styles.actions}>
        <button
          className={styles.exitButton}
          onClick={() => {
            bgMusic.pause();
            navigate('/insights');
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          Exit
        </button>
      </div>
    </div>
  );
}

