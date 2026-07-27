import { useEffect } from 'react';

export default function AdBanner() {
  useEffect(() => {
    try {
      // إجبار AdSense على إعادة القراءة والتحميل عند تنقل المستخدم بين الصفحات
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error("AdSense Push Error:", e);
    }
  }, []);

  return (
    <div 
      className="adsense-container"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100%',
        minHeight: '90px',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
        pointerEvents: 'none' /* لمنع حجب الضغطات إذا كان فارغاً */
      }}
    >
      <div style={{ pointerEvents: 'auto', width: '100%', maxWidth: '728px' }}>
        <ins className="adsbygoogle"
             style={{ display: 'block' }}
             data-ad-client="ca-pub-2250349622159347"
             data-ad-slot="9483492947" /* استبدل هذا الرقم بالـ Slot ID الخاص بك */
             data-ad-format="horizontal"
             data-full-width-responsive="true" />
      </div>
    </div>
  );
}