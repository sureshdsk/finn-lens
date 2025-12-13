import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useDataStore } from '../stores/dataStore';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
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

export default function Wrapped() {
  const navigate = useNavigate();
  const { parsedData, insights, selectedYear } = useDataStore();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isSharing, setIsSharing] = useState(false);
  const [bgStyle, setBgStyle] = useState<'blobs' | 'mesh' | 'particles'>('blobs');
  const slideRef = useRef<HTMLDivElement>(null);

  // Generate slides from insights and data
  const slides: SlideData[] = useMemo(() => {
    if (!parsedData) return [];

    const filteredTransactions = filterTransactionsByYear(parsedData.transactions, selectedYear);
    const filteredActivities = filterActivitiesByYear(parsedData.activities, selectedYear);

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
        title: 'Your GPay',
        value: selectedYear === 'all' ? 'All Time' : selectedYear,
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
            title: 'GPay Journey',
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
            title: 'Every Rupee Counts',
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
      value: 'GPay Wrapped',
      subtitle: selectedYear === 'all' ? 'All Time' : selectedYear,
      icon: '✨',
      bgColor: '#8B5CF6', // Purple
      detail: 'Share with friends!',
    });

    return generatedSlides;
  }, [parsedData, insights, selectedYear]);

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
      // Don't pause music on unmount - let it continue playing
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
    if (!slideRef.current) return;
    
    setIsSharing(true);
    try {
      // Disable animations for export by adding a class
      slideRef.current.classList.add(styles.exportMode);

      // Force a repaint to ensure background is rendered
      void slideRef.current.offsetHeight;

      // Wait for layout to stabilize and background to render
      await new Promise(resolve => setTimeout(resolve, 300));

      const canvas = await html2canvas(slideRef.current, {
        backgroundColor: null,
        scale: 3,
        useCORS: true,
        logging: true, // Enable logging to debug
        allowTaint: false,
        imageTimeout: 0,
        windowWidth: slideRef.current.scrollWidth,
        windowHeight: slideRef.current.scrollHeight,
        onclone: (clonedDoc) => {
          // Ensure the cloned element has proper styling
          const clonedSlide = clonedDoc.querySelector(`.${styles.slide}`) as HTMLElement;
          if (clonedSlide && slideRef.current) {
            // Copy the computed background from the original element
            const computedStyle = window.getComputedStyle(slideRef.current);
            clonedSlide.style.background = computedStyle.background;
            clonedSlide.style.opacity = '1';
            clonedSlide.style.isolation = 'isolate';
          }
        },
      });

      // Re-enable animations after capture
      slideRef.current.classList.remove(styles.exportMode);

      // Convert to blob and share or download
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const file = new File([blob], `gpay-wrapped-${slides[currentSlide].id}.png`, {
          type: 'image/png',
        });

        // Try native share if available
        if (navigator.share && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'My GPay Wrapped',
              text: 'Check out my GPay Wrapped!',
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
      setIsSharing(false);
    }
  }, [currentSlide, slides]);

  const downloadImage = (canvas: HTMLCanvasElement) => {
    const link = document.createElement('a');
    link.download = `gpay-wrapped-${slides[currentSlide].id}.png`;
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
        <h1 className={styles.headerTitle}>GPay Wrapped {selectedYear === 'all' ? 'All Time' : selectedYear}</h1>
        
        {/* Background Style Selector */}
        <div className={styles.bgSelector}>
          <button 
            className={`${styles.bgBtn} ${bgStyle === 'blobs' ? styles.active : ''}`}
            onClick={() => setBgStyle('blobs')}
            title="Blob Animation"
          >
            🫧
          </button>
          <button 
            className={`${styles.bgBtn} ${bgStyle === 'mesh' ? styles.active : ''}`}
            onClick={() => setBgStyle('mesh')}
            title="Geometric Mesh"
          >
            🔺
          </button>
          <button 
            className={`${styles.bgBtn} ${bgStyle === 'particles' ? styles.active : ''}`}
            onClick={() => setBgStyle('particles')}
            title="Particle System"
          >
            ✨
          </button>
        </div>
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
            style={{ position: 'relative', overflow: 'hidden' }}
          >
            {/* Dynamic Background based on selection */}
            {bgStyle === 'blobs' && (
              <div className={styles.blobContainer}>
                <div 
                  className={styles.blob1} 
                  style={{ backgroundColor: slide.bgColor }}
                />
                <div 
                  className={styles.blob2} 
                  style={{ backgroundColor: slide.bgColor, opacity: 0.7 }}
                />
                <div 
                  className={styles.blob3} 
                  style={{ backgroundColor: slide.bgColor, opacity: 0.5 }}
                />
              </div>
            )}
            
            {bgStyle === 'mesh' && (
              <div className={styles.meshContainer}>
                <svg className={styles.triangleMesh} viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice">
                  <defs>
                    <linearGradient id="meshGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{ stopColor: slide.bgColor, stopOpacity: 0.6 }} />
                      <stop offset="100%" style={{ stopColor: slide.bgColor, stopOpacity: 0.2 }} />
                    </linearGradient>
                  </defs>
                  <g>
                    {[...Array(20)].map((_, i) => {
                      const x = (i % 5) * 100 + Math.random() * 20;
                      const y = Math.floor(i / 5) * 100 + Math.random() * 20;
                      const x2 = x + 80 + Math.random() * 20;
                      const y2 = y + Math.random() * 40;
                      const x3 = x + Math.random() * 40;
                      const y3 = y + 80 + Math.random() * 20;
                      return (
                        <polygon
                          key={i}
                          points={`${x},${y} ${x2},${y2} ${x3},${y3}`}
                          fill="url(#meshGrad)"
                          stroke={slide.bgColor}
                          strokeWidth="0.5"
                          opacity="0.3"
                          className={styles.meshTriangle}
                          style={{ animationDelay: `${i * 0.1}s` }}
                        />
                      );
                    })}
                  </g>
                </svg>
              </div>
            )}
            
            {bgStyle === 'particles' && (
              <div className={styles.particleContainer}>
                {[...Array(30)].map((_, i) => (
                  <div
                    key={i}
                    className={styles.particleDot}
                    style={{
                      backgroundColor: slide.bgColor,
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 5}s`,
                      animationDuration: `${10 + Math.random() * 20}s`,
                      width: `${2 + Math.random() * 4}px`,
                      height: `${2 + Math.random() * 4}px`,
                    }}
                  />
                ))}
              </div>
            )}
            
            {/* Animated background elements */}
            <div className={styles.animatedBg}>
              <div className={styles.particle1}></div>
              <div className={styles.particle2}></div>
              <div className={styles.particle3}></div>
              <div className={styles.glowOrb}></div>
              
              {/* Floating emojis */}
              <div className={styles.floatingEmoji1}>✨</div>
              <div className={styles.floatingEmoji2}>💫</div>
              <div className={styles.floatingEmoji3}>⭐</div>
              
              {/* Animated shapes */}
              <div className={styles.shape1}></div>
              <div className={styles.shape2}></div>
              
              {/* New creative elements */}
              <div className={styles.wavePattern}></div>
              <div className={styles.hexGrid}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className={styles.hex} style={{animationDelay: `${i * 0.2}s`}}></div>
                ))}
              </div>
              
              {/* Neon lines removed */}
              
              {/* Bubble effects */}
              {[...Array(5)].map((_, i) => (
                <div 
                  key={`bubble-${i}`}
                  className={styles.bubble}
                  style={{
                    left: `${20 + i * 15}%`,
                    animationDelay: `${i * 0.5}s`,
                    width: `${30 + i * 10}px`,
                    height: `${30 + i * 10}px`
                  }}
                />
              ))}
            </div>
            
            <div className={styles.slideContent}>
              <div className={styles.slideIcon}>{slide.icon}</div>
              <h2 className={styles.slideTitle}>{slide.title}</h2>
              <div className={styles.slideValue}>{slide.value}</div>
              <p className={styles.slideSubtitle}>{slide.subtitle}</p>
              {slide.detail && <p className={styles.slideDetail}>{slide.detail}</p>}
              
              {/* Celebration burst removed */}
              
              <div className={styles.watermark}>gpay-wrapped.pages.dev</div>
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
          onClick={() => navigate('/insights')}
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

