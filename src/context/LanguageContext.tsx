import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'hi' | 'mr' | 'ta' | 'te';

interface TranslationDict {
  [key: string]: {
    en: string;
    hi: string;
    mr: string;
    ta: string;
    te: string;
  };
}

export const translations: TranslationDict = {
  // Common
  'dashboard': {
    en: 'Dashboard',
    hi: 'डैशबोर्ड',
    mr: 'डॅशबोर्ड',
    ta: 'டாஷ்போர்டு',
    te: 'డాష్‌బోర్డ్'
  },
  'plantation_guide': {
    en: 'Plantation Guide',
    hi: 'वृक्षारोपण गाइड',
    mr: 'वृक्षारोपण मार्गदर्शक',
    ta: 'தோட்டக்கலை வழிகாட்டி',
    te: 'మొక్కల పెంపకం మార్గదర్శి'
  },
  'farmer_gpt': {
    en: 'Farmer GPT',
    hi: 'किसान GPT',
    mr: 'शेतकरी GPT',
    ta: 'விவசாயி GPT',
    te: 'రైతు GPT'
  },
  'crop_predictor': {
    en: 'Crop Predictor',
    hi: 'फसल भविष्यवेत्ता',
    mr: 'पीक भविष्‍यवाणी',
    ta: 'பயிர் முன்கணிப்பு',
    te: 'పంట సూచిక'
  },
  'marketplace': {
    en: 'Marketplace',
    hi: 'बाज़ार',
    mr: 'बाजारपेठ',
    ta: 'சந்தை',
    te: 'మార్కెట్ ప్లేస్'
  },
  'calendar': {
    en: 'Calendar',
    hi: 'कैलेंडर',
    mr: 'कॅलेंडर',
    ta: 'நாட்காட்டி',
    te: 'క్యాలెండర్'
  },
  'knowledge_base': {
    en: 'Knowledge Base',
    hi: 'ज्ञान आधार',
    mr: 'ज्ञान कोश',
    ta: 'அறிவுத் தளம்',
    te: 'జ్ఞాన భాండాగారం'
  },
  'pest_treatment_guide': {
    en: 'Pest & Treatment Guide',
    hi: 'कीट और उपचार गाइड',
    mr: 'कीड आणि उपचार मार्गदर्शक',
    ta: 'பூச்சி மற்றும் சிகிச்சை வழிகாட்டி',
    te: 'తెగుళ్లు & నివారణ మార్గదర్శి'
  },
  'search_pests_desc': {
    en: 'Search for common pests and treatment methods',
    hi: 'सामान्य कीटों और उपचार विधियों को खोजें',
    mr: 'सामान्य कीड आणि उपचार पद्धती शोधा',
    ta: 'பொதுவான பூச்சிகள் மற்றும் சிகிச்சை முறைகளைத் தேடுங்கள்',
    te: 'సాధారణ తెగుళ్లు మరియు నివారణ పద్ధతుల కోసం శోధించండి'
  },
  'ask_ai_pest': {
    en: 'Ask AI about any pest or disease',
    hi: 'किसी भी कीट या बीमारी के बारे में AI से पूछें',
    mr: 'कोणत्याही कीड किंवा रोगाबद्दल AI ला विचारा',
    ta: 'ஏதேனும் பூச்சி அல்லது நோய் பற்றி AI-யிடம் கேளுங்கள்',
    te: 'ఏదైనా తెగులు లేదా వ్యాధి గురించి AI ని అడగండి'
  },
  'quick_reference_guide': {
    en: 'Quick Reference Guide',
    hi: 'त्वरित संदर्भ गाइड',
    mr: 'त्वरित संदर्भ मार्गदर्शक',
    ta: 'விரைவான குறிப்பு வழிகாட்டி',
    te: 'త్వరిత సూచన మార్గదర్శి'
  },
  'farm_diary': {
    en: 'Farm Diary',
    hi: 'फार्म डायरी',
    mr: 'फार्म डायरी',
    ta: 'பண்ணை நாட்குறிப்பு',
    te: 'ఫాం డైరీ'
  },
  'log_daily_activities': {
    en: 'Log your daily farming activities',
    hi: 'अपनी दैनिक खेती की गतिविधियों को दर्ज करें',
    mr: 'तुमच्या दैनंदिन शेती क्रियांची नोंद करा',
    ta: 'உங்கள் தினசரி விவசாய நடவடிக்கைகளை பதிவு செய்யவும்',
    te: 'మీ రోజువారీ వ్యవసాయ కార్యకలాపాలను నమోదు చేయండి'
  },
  'total_entries': {
    en: 'Total Entries',
    hi: 'कुल प्रविष्टियां',
    mr: 'एकूण नोंदणी',
    ta: 'மொத்த பதிவுகள்',
    te: 'మొత్తం నమోదులు'
  },
  'expenses': {
    en: 'Expenses',
    hi: 'कुल खर्च',
    mr: 'खर्च',
    ta: 'செலவுகள்',
    te: 'ఖర్చులు'
  },
  'income': {
    en: 'Income',
    hi: 'कुल आय',
    mr: 'उत्पन्न',
    ta: 'வருமானம்',
    te: 'ఆదాయం'
  },
  'profit': {
    en: 'Profit',
    hi: 'कुल लाभ',
    mr: 'नफा',
    ta: 'லாபம்',
    te: 'లాభం'
  },
  'add_entry': {
    en: 'Add Entry',
    hi: 'प्रविष्टि जोड़ें',
    mr: 'नोंद जोडा',
    ta: 'பதிவைச் சேர்க்கவும்',
    te: 'నమోదు జోడించు'
  },
  'export': {
    en: 'Export',
    hi: 'निर्यात',
    mr: 'निर्यात करा',
    ta: 'ஏற்றுமதி',
    te: 'ఎగుమతి'
  },
  'income_vs_expenses': {
    en: 'Income vs Expenses',
    hi: 'आय बनाम खर्च',
    mr: 'उत्पन्न विरुद्ध खर्च',
    ta: 'வருமானம் vs செலவுகள்',
    te: 'ఆదాయం vs ఖర్చులు'
  },
  'expense_breakdown': {
    en: 'Expense Breakdown',
    hi: 'खर्च का विवरण',
    mr: 'खर्चाचा तपशील',
    ta: 'செலவு முறிவு',
    te: 'ఖర్చుల వివరాలు'
  },
  'new_entry': {
    en: 'New Entry',
    hi: 'नई प्रविष्टि',
    mr: 'नवीन नोंद',
    ta: 'புதிய பதிவு',
    te: 'కొత్త నమోదు'
  },
  'activity_placeholder': {
    en: 'What did you do? e.g., Planted rice seedlings',
    hi: 'आपने क्या किया? जैसे, धान के पौधे रोपे',
    mr: 'तुम्ही काय केले? उदा., भाताची रोपे लावली',
    ta: 'நீங்கள் என்ன செய்தீர்கள்? எ.கா., நெல் நாற்று நட்டேன்',
    te: 'మీరు ఏమి చేశారు? ఉదా., వరి నారు నాటారు'
  },
  'save_entry': {
    en: 'Save Entry',
    hi: 'प्रविष्टि सहेजें',
    mr: 'नोंद जतन करा',
    ta: 'பதிவைச் சேமிக்கவும்',
    te: 'నమోదు సేవ్ చేయండి'
  },
  'cancel': {
    en: 'Cancel',
    hi: 'रद्द करें',
    mr: 'रद्द करा',
    ta: 'ரத்து செய்',
    te: 'ரద్దు'
  },
  'profile': {
    en: 'Profile',
    hi: 'प्रोफ़ाइल',
    mr: 'प्रोफाइल',
    ta: 'சுயவிவரம்',
    te: 'ప్రొఫైల్'
  },
  'logout': {
    en: 'Log Out',
    hi: 'लॉग आउट',
    mr: 'लॉग आउट',
    ta: 'வெளியேறு',
    te: 'లాగ్ అవుట్'
  },
  'welcome_back': {
    en: 'Welcome back',
    hi: 'आपका स्वागत है',
    mr: 'पुन्हा स्वागत आहे',
    ta: 'மீண்டும் வருக',
    te: 'స్వాగతం'
  },
  'add_plant': {
    en: 'Add New Plant',
    hi: 'नया पौधा जोड़ें',
    mr: 'नवीन रोप जोडा',
    ta: 'புதிய செடியைச் சேர்',
    te: 'కొత్త మొక్కను జోడించండి'
  },
  'search': {
    en: 'Search',
    hi: 'खोजें',
    mr: 'शोधा',
    ta: 'தேடல்',
    te: 'శోధన'
  },
  'language': {
    en: 'Language',
    hi: 'भाषा',
    mr: 'भाषा',
    ta: 'மொழி',
    te: 'భాష'
  },
  'welcome_back_user': {
    en: 'Welcome back',
    hi: 'आपका स्वागत है',
    mr: 'पुन्हा स्वागत आहे',
    ta: 'மீண்டும் வருக',
    te: 'స్వాగతం'
  },
  'plants_count': {
    en: 'You have {count} plants in your care',
    hi: 'आपके पास {count} पौधों की देखभाल है',
    mr: 'तुमच्याकडे {count} झाडे आहेत',
    ta: 'உங்கள் பராமரிப்பில் {count} செடிகள் உள்ளன',
    te: 'మీ వద్ద {count} మొక్కలు ఉన్నాయి'
  },
  'my_plants': {
    en: 'My Plants',
    hi: 'मेरे पौधे',
    mr: 'माझी झाडे',
    ta: 'என் செடிகள்',
    te: 'నా మొక్కలు'
  },
  'view_all': {
    en: 'View All',
    hi: 'सभी देखें',
    mr: 'सर्व पहा',
    ta: 'அனைத்தையும் பார்',
    te: 'అన్నీ చూడండి'
  },
  'upcoming_care': {
    en: 'Upcoming Care',
    hi: 'आगामी देखभाल',
    mr: 'येणारी काळजी',
    ta: 'வரவிருக்கும் பராமரிப்பு',
    te: 'రాబోయే సంరక్షణ'
  },
  'no_plants_yet': {
    en: 'No plants yet',
    hi: 'अभी तक कोई पौधा नहीं',
    mr: 'अद्याप झाडे नाहीत',
    ta: 'இன்னும் செடிகள் இல்லை',
    te: 'ఇంకా మొక్కలు లేవు'
  },
  'start_garden_msg': {
    en: 'Start your digital garden by adding your first plant today.',
    hi: 'आज ही अपना पहला पौधा जोड़कर अपना डिजिटल गार्डन शुरू करें।',
    mr: 'आज तुमचे पहिले रोप जोडून तुमची डिजिटल बाग सुरू करा.',
    ta: 'இன்று உங்கள் முதல் செடியைச் சேர்ப்பதன் மூலம் உங்கள் டிஜிட்டல் தோட்டத்தைத் தொடங்குங்கள்.',
    te: 'ఈరోజే మీ మొదటి మొక్కను జోడించడం ద్వారా మీ డిజిటల్ గార్డెన్‌ను ప్రారంభించండి.'
  },
  'add_first_plant': {
    en: 'Add Your First Plant',
    hi: 'अपना पहला पौधा जोड़ें',
    mr: 'तुमचे पहिले रोप जोडा',
    ta: 'உங்கள் முதல் செடியைச் சேர்க்கவும்',
    te: 'మీ మొదటి మొక్కను జోడించండి'
  },
  'ai_seasonal_tip': {
    en: 'AI Seasonal Tip',
    hi: 'AI मौसमी सुझाव',
    mr: 'AI हंगामी टीप',
    ta: 'AI பருவகால குறிப்பு',
    te: 'AI సీజనల్ చిట్కా'
  },
  'learn_more': {
    en: 'Learn More',
    hi: 'अधिक जानें',
    mr: 'अधिक जाणून घ्या',
    ta: 'மேலும் அறிய',
    te: 'మరింత తెలుసుకోండి'
  },
  'learning_center': {
    en: 'Learning Center',
    hi: 'शिक्षण केंद्र',
    mr: 'शिक्षण केंद्र',
    ta: 'கற்றல் மையம்',
    te: 'లెర్నింగ్ సెంటర్'
  },
  'plantation_guide_desc': {
    en: 'Master the art of plantation with our curated video tutorials and expert guides.',
    hi: 'हमारे क्यूरेटेड वीडियो ट्यूटोरियल और विशेषज्ञ गाइड के साथ वृक्षारोपण की कला में महारत हासिल करें।',
    mr: 'आमच्या क्युरेट केलेले व्हिडिओ ट्यूटोरियल आणि तज्ञ मार्गदर्शकांसह वृक्षारोपणाच्या कलेमध्ये प्रभुत्व मिळवा.',
    ta: 'எங்கள் க்யூரேட்டட் வீடியோ பயிற்சிகள் மற்றும் நிபுணர் வழிகாட்டிகளுடன் தோட்டக்கலை கலையில் தேர்ச்சி பெறுங்கள்.',
    te: 'మా వీడియో ట్యుటోరియల్స్ మరియు నిపుణుల మార్గదర్శకాలతో మొక్కల పెంపకంలో ప్రావీణ్యం సంపాదించండి.'
  },
  'search_guides': {
    en: 'Search guides...',
    hi: 'गाइड खोजें...',
    mr: 'मार्गदर्शक शोधा...',
    ta: 'வழிகாட்டிகளைத் தேடுங்கள்...',
    te: 'గైడ్‌లను శోధించండి...'
  },
  'all_categories': {
    en: 'All',
    hi: 'सभी',
    mr: 'सर्व',
    ta: 'அனைத்து',
    te: 'అన్నీ'
  },
  'planting': {
    en: 'Planting',
    hi: 'रोपण',
    mr: 'लागवड',
    ta: 'நடவு',
    te: 'నాటడం'
  },
  'caring': {
    en: 'Caring',
    hi: 'देखभाल',
    mr: 'काळजी',
    ta: 'பராமரிப்பு',
    te: 'సంరక్షణ'
  },
  'fertilizers': {
    en: 'Fertilizers',
    hi: 'उर्वरक',
    mr: 'खते',
    ta: 'உரங்கள்',
    te: 'ఎరువులు'
  },
  'pruning': {
    en: 'Pruning',
    hi: 'छंटाई',
    mr: 'छाटणी',
    ta: 'கத்தரித்தல்',
    te: 'కత్తిరింపు'
  },
  'beginner': {
    en: 'Beginner',
    hi: 'शुरुआती',
    mr: 'नवशिक्या',
    ta: 'தொடக்கக்காரர்',
    te: 'ప్రారంభకులకు'
  },
  'intermediate': {
    en: 'Intermediate',
    hi: 'मध्यवर्ती',
    mr: 'मध्यवर्ती',
    ta: 'இடைநிலை',
    te: 'మధ్యస్థ స్థాయి'
  },
  'expert': {
    en: 'Expert',
    hi: 'विशेषज्ञ',
    mr: 'तज्ञ',
    ta: 'நிபுணர்',
    te: 'నిపుణుడు'
  },
  'quick_tips_title': {
    en: 'Essential Quick Tips for Thriving Trees',
    hi: 'फलते-फूलते पेड़ों के लिए आवश्यक त्वरित सुझाव',
    mr: 'बहरलेल्या झाडांसाठी आवश्यक क्विक टिप्स',
    ta: 'செழிப்பான மரங்களுக்கான அத்தியாவசிய விரைவான குறிப்புகள்',
    te: 'మొక్కలు ఏపుగా పెరగడానికి ముఖ్యమైన చిట్కాలు'
  },
  'deep_watering': {
    en: 'Deep Watering',
    hi: 'गहरा पानी देना',
    mr: 'खोलवर पाणी देणे',
    ta: 'ஆழமான நீர் பாய்ச்சுதல்',
    te: 'లోతుగా నీరు పోయడం'
  },
  'mulching_matters': {
    en: 'Mulching Matters',
    hi: 'मल्चिंग का महत्व',
    mr: 'मल्चिंगचे महत्त्व',
    ta: 'மூடாக்கு முக்கியமானது',
    te: 'మల్చింగ్ ప్రాముఖ్యత'
  },
  'soil_foundation': {
    en: 'Soil Foundation',
    hi: 'मिट्टी की नींव',
    mr: 'मातीचा पाया',
    ta: 'மண் அடித்தளம்',
    te: 'నేల పునాది'
  },
  'join_community': {
    en: 'Join the Community',
    hi: 'समुदाय में शामिल हों',
    mr: 'समुदायात सामील व्हा',
    ta: 'சமூகத்தில் இணையுங்கள்',
    te: 'సంఘంలో చేరండి'
  },
  'plant_million_trees': {
    en: 'Help us plant 1 Million Trees by 2030',
    hi: '2030 तक 10 लाख पेड़ लगाने में हमारी मदद करें',
    mr: '2030 पर्यंत 10 लाख झाडे लावण्यास आम्हाला मदत करा',
    ta: '2030க்குள் 1 மில்லியன் மரங்களை நட எங்களுக்கு உதவுங்கள்',
    te: '2030 నాటికి 10 లక్షల మొక్కలు నాటడంలో మాకు సహాయపడండి'
  },
  'ai_agri_expert': {
    en: 'AI Agriculture Expert',
    hi: 'AI कृषि विशेषज्ञ',
    mr: 'AI कृषी तज्ञ',
    ta: 'AI விவசாய நிபுணர்',
    te: 'AI వ్యవసాయ నిపుణుడు'
  },
  'clear_chat': {
    en: 'Clear Chat',
    hi: 'चैट साफ़ करें',
    mr: 'चॅट साफ करा',
    ta: 'அரட்டையை அழி',
    te: 'చాట్‌ను క్లియర్ చేయండి'
  },
  'how_can_help_farm': {
    en: 'How can I help your farm today?',
    hi: 'आज मैं आपके खेत में कैसे मदद कर सकता हूँ?',
    mr: 'आज मी तुमच्या शेतीला कशी मदत करू शकतो?',
    ta: 'இன்று உங்கள் பண்ணைக்கு நான் எப்படி உதவ முடியும்?',
    te: 'ఈరోజు మీ పొలానికి నేను ఎలా సహాయం చేయగలను?'
  },
  'gpt_placeholder_msg': {
    en: 'Ask about crop diseases, fertilizing schedules, or seasonal planting advice.',
    hi: 'फसल रोगों, खाद के कार्यक्रम या मौसमी रोपण सलाह के बारे में पूछें।',
    mr: 'पीक रोग, खत वेळापत्रक किंवा हंगामी लागवड सल्ल्याबद्दल विचारा.',
    ta: 'பயிர் நோய்கள், உரமிடும் அட்டவணைகள் அல்லது பருவகால நடவு ஆலோசனைகள் பற்றி கேளுங்கள்.',
    te: 'పంట వ్యాధులు, ఎరువులు వేసే సమయాలు లేదా సీజనల్ పెంపకం సలహాల గురించి అడగండి.'
  },
  'gpt_thinking': {
    en: 'Farmer GPT is thinking...',
    hi: 'किसान GPT सोच रहा है...',
    mr: 'शेतकरी GPT विचार करत आहे...',
    ta: 'விவசாயி GPT யோசிக்கிறார்...',
    te: 'రైతు GPT ఆలోచిస్తున్నాడు...'
  },
  'speak_query': {
    en: 'Speak your query...',
    hi: 'अपना प्रश्न बोलें...',
    mr: 'तुमची क्वेरी बोला...',
    ta: 'உங்கள் கேள்வியைச் சொல்லுங்கள்...',
    te: 'మీ ప్రశ్నను చెప్పండి...'
  },
  'ask_anything_farming': {
    en: 'Ask anything about farming...',
    hi: 'खेती के बारे में कुछ भी पूछें...',
    mr: 'शेतीबद्दल काहीही विचारा...',
    ta: 'விவசாயத்தைப் பற்றி எதையும் கேளுங்கள்...',
    te: 'వ్యవసాయం గురించి ఏదైనా అడగండి...'
  },
  'crop_yield_predictor_title': {
    en: 'Crop Yield Predictor',
    hi: 'फसल उपज भविष्यवेत्ता',
    mr: 'पीक उत्पादन भविष्यवेत्ता',
    ta: 'பயிர் மகசூல் முன்கணிப்பு',
    te: 'పంట దిగుబడి సూచిక'
  },
  'crop_predictor_desc': {
    en: 'Estimate your harvest and profit potential using AI and real-time weather data.',
    hi: 'AI और वास्तविक समय के मौसम डेटा का उपयोग करके अपनी फसल और लाभ क्षमता का अनुमान लगाएं।',
    mr: 'AI आणि रिअल-टाइम हवामान डेटा वापरून तुमच्या कापणीचा आणि नफ्याच्या संभाव्यतेचा अंदाज लावा.',
    ta: 'AI மற்றும் நிகழ்நேர வானிலை தரவைப் பயன்படுத்தி உங்கள் அறுவடை மற்றும் லாப திறனை மதிப்பிடுங்கள்.',
    te: 'AI మరియు రియల్ టైమ్ వాతావరణ డేటాను ఉపయోగించి మీ కోత మరియు లాభాల సామర్థ్యాన్ని అంచనా వేయండి.'
  },
  'crop_type': {
    en: 'Crop Type',
    hi: 'फसल का प्रकार',
    mr: 'पिकाचा प्रकार',
    ta: 'பயிர் வகை',
    te: 'పంట రకం'
  },
  'land_size': {
    en: 'Land Size',
    hi: 'भूमि का आकार',
    mr: 'जमिनीचा आकार',
    ta: 'நிலத்தின் அளவு',
    te: 'భూమి వైశాల్యం'
  },
  'unit': {
    en: 'Unit',
    hi: 'इकाई',
    mr: 'युनिट',
    ta: 'அலகு',
    te: 'యూనిట్'
  },
  'weather_context': {
    en: 'Weather Context',
    hi: 'मौसम का संदर्भ',
    mr: 'हवामान संदर्भ',
    ta: 'வானிலை சூழல்',
    te: 'వాతావరణ సందర్భం'
  },
  'predict_btn': {
    en: 'Predict Yield & Profit',
    hi: 'उपज और लाभ की भविष्यवाणी करें',
    mr: 'उत्पादन आणि नफ्याचा अंदाज लावा',
    ta: 'மகசூல் மற்றும் லாபத்தை கணிக்கவும்',
    te: 'దిగుబడి & లాభాన్ని అంచనా వేయండి'
  },
  'calculating_prediction': {
    en: 'Calculating Prediction...',
    hi: 'भविष्यवाणी की गणना की जा रही है...',
    mr: 'अंदाज लावला जात आहे...',
    ta: 'முன்கணிப்பைக் கணக்கிடுகிறது...',
    te: 'అంచనాను గణిస్తోంది...'
  },
  'expected_yield': {
    en: 'Expected Yield',
    hi: 'अपेक्षित उपज',
    mr: 'अपेक्षित उत्पादन',
    ta: 'எதிர்பார்க்கப்படும் மகசூல்',
    te: 'ఆశించిన దిగుబడి'
  },
  'profit_estimation_label': {
    en: 'Profit Estimation',
    hi: 'लाभ का अनुमान',
    mr: 'नफ्याचा अंदाज',
    ta: 'லாப மதிப்பீடு',
    te: 'లాభ అంచనా'
  },
  'est_revenue': {
    en: 'Est. Revenue',
    hi: 'अनुमानित राजस्व',
    mr: 'अंदाजित महसूल',
    ta: 'மதிப்பிடப்பட்ட வருவாய்',
    te: 'అంచనా ఆదాయం'
  },
  'est_costs': {
    en: 'Est. Costs',
    hi: 'अनुमानित लागत',
    mr: 'अंदाजित खर्च',
    ta: 'மதிப்பிடப்பட்ட செலவுகள்',
    te: 'అంచనా ఖర్చులు'
  },
  'key_factors': {
    en: 'Key Factors',
    hi: 'प्रमुख कारक',
    mr: 'प्रमुख घटक',
    ta: 'முக்கிய காரணிகள்',
    te: 'ముఖ్యమైన అంశాలు'
  },
  'ai_recommendations': {
    en: 'AI Recommendations',
    hi: 'AI सिफारिशें',
    mr: 'AI शिफारसी',
    ta: 'AI பரிந்துரைகள்',
    te: 'AI సిఫార్సులు'
  },
  'ready_to_analyze': {
    en: 'Ready to Analyze',
    hi: 'विश्लेषण के लिए तैयार',
    mr: 'विश्लेषणासाठी तयार',
    ta: 'பகுப்பாய்வு செய்ய தயார்',
    te: 'విశ్లేషణకు సిద్ధంగా ఉంది'
  },
  'account_settings': {
    en: 'Account Settings',
    hi: 'खाता सेटिंग्स',
    mr: 'खात्याची सेटिंग्ज',
    ta: 'கணக்கு அமைப்புகள்',
    te: 'ఖాతా సెట్టింగ్‌లు'
  },
  'notification_prefs': {
    en: 'Notification Preferences',
    hi: 'अधिसूचना प्राथमिकताएं',
    mr: 'सूचना आवडी',
    ta: 'அறிவிப்பு விருப்பத்தேர்வுகள்',
    te: 'నోటిఫికేషన్ ప్రాధాన్యతలు'
  },
  'app_settings': {
    en: 'App Settings',
    hi: 'ऐप सेटिंग्स',
    mr: 'अ‍ॅप सेटिंग्ज',
    ta: 'பயன்பாட்டு அமைப்புகள்',
    te: 'యాప్ సెట్టింగ్‌లు'
  },
  'save_changes': {
    en: 'Save Changes',
    hi: 'परिवर्तन सहेजें',
    mr: 'बदल जतन करा',
    ta: 'மாற்றங்களை சேமி',
    te: 'మార్పులను సేవ్ చేయి'
  },
  'personal_info': {
    en: 'Personal Information',
    hi: 'व्यक्तिगत जानकारी',
    mr: 'वैयक्तिक माहिती',
    ta: 'தனிப்பட்ட தகவல்',
    te: 'వ్యక్తిగత సమాచారం'
  },
  'email_address': {
    en: 'Email Address',
    hi: 'ईमेल पता',
    mr: 'ईमेल पत्ता',
    ta: 'மின்னஞ்சல் முகவரி',
    te: 'ఇమెయిల్ చిరునామా'
  },
  'phone_number': {
    en: 'Phone Number',
    hi: 'फ़ोन नंबर',
    mr: 'फोन नंबर',
    ta: 'தொலைபேசி எண்',
    te: 'ఫోన్ నంబర్'
  },
  'care_reminders': {
    en: 'Care Reminders',
    hi: 'देखभाल अनुस्मारक',
    mr: 'काळजी स्मरणपत्रे',
    ta: 'பராமரிப்பு நினைवூட்டல்கள்',
    te: 'సంరక్షణ రిమైండర్లు'
  },
  'weather_alerts': {
    en: 'Weather & Forecast Alerts',
    hi: 'मौसम और पूर्वानुमान अलर्ट',
    mr: 'हवामान आणि अंदाज अलर्ट',
    ta: 'வானிலை மற்றும் முன்னறிவிப்பு எச்சரிக்கைகள்',
    te: 'వాతావరణ మరియు అంచనా హెచ్చరికలు'
  },
  'community_updates': {
    en: 'Community Updates',
    hi: 'सामुदायिक अपडेट',
    mr: 'समुदाय अपडेट',
    ta: 'சமூக அறிவிப்புகள்',
    te: 'సంఘం అప్‌డేట్‌లు'
  },
  'measurement_unit': {
    en: 'Measurement Unit',
    hi: 'मापन इकाई',
    mr: 'मोजमाप युनिट',
    ta: 'அலகு',
    te: 'యూనిట్'
  },
  'language_selection': {
    en: 'Language Selection',
    hi: 'भाषा चयन',
    mr: 'भाषा निवड',
    ta: 'மொழித் தேர்வு',
    te: 'భాష ఎంపిక'
  },
  'not_provided': {
    en: 'Not Provided',
    hi: 'प्रदान नहीं किया गया',
    mr: 'पुरवले नाही',
    ta: 'வழங்கப்படவில்லை',
    te: 'అందించబడలేదు'
  },
  'download_app': {
    en: 'Download App',
    hi: 'ऐप डाउनलोड करें',
    mr: 'अ‍ॅप डाउनलोड करा',
    ta: 'செயலியைப் பதிவிறக்கவும்',
    te: 'యాప్‌ను డౌన్‌లోడ్ చేయండి'
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string) => {
    if (!translations[key]) return key;
    return translations[key][language];
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}
