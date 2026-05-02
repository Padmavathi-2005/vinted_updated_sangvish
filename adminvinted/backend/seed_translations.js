import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import connectDB from './config/db.js';
import FrontendContent from './models/FrontendContent.js';

// All translations — values object has lang_code: translated_text
const allContent = [
    // ========= HOME / HERO SECTION =========
    {
        section: 'home', key: 'hero_badge',
        values: {
            en: 'LOCAL CLASSIFIEDS MARKETPLACE',
            fr: 'MARCHÉ DE PETITES ANNONCES LOCALES',
            de: 'LOKALER KLEINANZEIGENMARKT',
            es: 'MERCADO LOCAL DE ANUNCIOS CLASIFICADOS',
            it: 'MERCATO LOCALE DI ANNUNCI',
            pt: 'MERCADO LOCAL DE CLASSIFICADOS',
            nl: 'LOKALE ADVERTENTIEMARKTPLAATS',
            ru: 'МЕСТНЫЙ РЫНОК ОБЪЯВЛЕНИЙ',
            ar: 'سوق الإعلانات المحلية',
            zh: '本地分类广告市场',
            ja: 'ローカル広告マーケットプレイス',
            ko: '지역 분류 광고 시장',
            hi: 'स्थानीय वर्गीकृत बाज़ार',
        }
    },
    {
        section: 'home', key: 'hero_title',
        values: {
            en: 'Buy & sell everything from cars to couches.',
            fr: 'Achetez et vendez tout, des voitures aux canapés.',
            de: 'Kaufen & verkaufen Sie alles, von Autos bis Sofas.',
            es: 'Compra y vende de todo, desde coches hasta sofás.',
            it: 'Compra e vendi tutto, dalle auto ai divani.',
            pt: 'Compre e venda tudo, de carros a sofás.',
            nl: "Koop en verkoop alles van auto's tot banken.",
            ru: 'Покупайте и продавайте всё — от авто до диванов.',
            ar: 'اشتر وبع كل شيء من السيارات إلى الأرائك.',
            zh: '买卖一切，从汽车到沙发。',
            ja: '車からソファまで、何でも売買。',
            ko: '자동차부터 소파까지 모든 것을 사고파세요.',
            hi: 'कारों से लेकर सोफों तक सब कुछ खरीदें और बेचें।',
        }
    },
    {
        section: 'home', key: 'hero_subtitle',
        values: {
            en: 'Join millions of neighbors finding great deals on pre-owned items.',
            fr: "Rejoignez des millions de voisins qui trouvent de super offres sur des articles d'occasion.",
            de: 'Schließen Sie sich Millionen von Nachbarn an, die tolle Angebote für gebrauchte Artikel finden.',
            es: 'Únete a millones de vecinos que encuentran grandes ofertas en artículos de segunda mano.',
            it: 'Unisciti a milioni di vicini che trovano ottime offerte su articoli usati.',
            pt: 'Junte-se a milhões de vizinhos encontrando ótimas ofertas em itens usados.',
            nl: 'Sluit je aan bij miljoenen buren die geweldige deals vinden op tweedehands spullen.',
            ru: 'Присоединяйтесь к миллионам соседей, находящих выгодные сделки.',
            ar: 'انضم إلى ملايين الجيران للعثور على صفقات رائعة على العناصر المستعملة.',
            zh: '加入数百万邻居，在二手物品上找到好价格。',
            ja: '何百万人もの近所の人と一緒に中古品の掘り出し物を見つけよう。',
            ko: '수백만 명의 이웃과 함께 중고품에서 좋은 거래를 찾으세요.',
            hi: 'लाखों पड़ोसियों के साथ जुड़ें और पुरानी वस्तुओं पर बेहतरीन सौदे पाएं।',
        }
    },
    {
        section: 'home', key: 'start_selling',
        values: {
            en: 'Start Selling',
            fr: 'Commencer à vendre',
            de: 'Mit dem Verkaufen beginnen',
            es: 'Empezar a vender',
            it: 'Inizia a vendere',
            pt: 'Comece a vender',
            nl: 'Begin met verkopen',
            ru: 'Начать продавать',
            ar: 'ابدأ البيع',
            zh: '开始销售',
            ja: '販売を開始する',
            ko: '판매 시작하기',
            hi: 'बेचना शुरू करें',
        }
    },
    {
        section: 'home', key: 'explore_items',
        values: {
            en: 'Explore Items',
            fr: 'Explorer les articles',
            de: 'Artikel erkunden',
            es: 'Explorar artículos',
            it: 'Esplora gli articoli',
            pt: 'Explorar itens',
            nl: 'Verken items',
            ru: 'Исследовать товары',
            ar: 'استكشاف العناصر',
            zh: '浏览商品',
            ja: 'アイテムを探す',
            ko: '상품 탐색하기',
            hi: 'आइटम खोजें',
        }
    },
    {
        section: 'home', key: 'stat_rating_value',
        values: {
            en: '4.8/5', fr: '4.8/5', de: '4.8/5', es: '4.8/5',
            it: '4.8/5', pt: '4.8/5', nl: '4.8/5', ru: '4.8/5',
            ar: '4.8/5', zh: '4.8/5', ja: '4.8/5', ko: '4.8/5', hi: '4.8/5',
        }
    },
    {
        section: 'home', key: 'stat_rating_label',
        values: {
            en: 'User Trust Rating',
            fr: 'Indice de confiance utilisateurs',
            de: 'Nutzervertrauenswertung',
            es: 'Índice de confianza de usuarios',
            it: 'Valutazione di fiducia utenti',
            pt: 'Índice de confiança dos utilizadores',
            nl: 'Gebruikersvertrouwensscore',
            ru: 'Рейтинг доверия пользователей',
            ar: 'تقييم ثقة المستخدمين',
            zh: '用户信任评分',
            ja: 'ユーザー信頼スコア',
            ko: '사용자 신뢰 등급',
            hi: 'उपयोगकर्ता विश्वास रेटिंग',
        }
    },
    {
        section: 'home', key: 'stat_sellers_value',
        values: {
            en: '5M+', fr: '5M+', de: '5 Mio.+', es: '+5M',
            it: '5M+', pt: '+5M', nl: '5M+', ru: '5М+',
            ar: '+5M', zh: '500万+', ja: '500万人以上', ko: '500만+', hi: '५०लाख+',
        }
    },
    {
        section: 'home', key: 'stat_sellers_label',
        values: {
            en: 'Happy Sellers',
            fr: 'Vendeurs satisfaits',
            de: 'Zufriedene Verkäufer',
            es: 'Vendedores felices',
            it: 'Venditori soddisfatti',
            pt: 'Vendedores satisfeitos',
            nl: 'Tevreden verkopers',
            ru: 'Довольных продавцов',
            ar: 'بائعون سعداء',
            zh: '快乐的卖家',
            ja: '満足した売り手',
            ko: '만족한 판매자',
            hi: 'खुश विक्रेता',
        }
    },

    // ========= SUSTAINABILITY SECTION =========
    {
        section: 'sustainability', key: 'give_second_life',
        values: {
            en: 'Give your items a second life.',
            fr: 'Donnez une seconde vie à vos objets.',
            de: 'Geben Sie Ihren Artikeln ein zweites Leben.',
            es: 'Dale una segunda vida a tus artículos.',
            it: 'Dai una seconda vita ai tuoi oggetti.',
            pt: 'Dê uma segunda vida aos seus itens.',
            nl: 'Geef je spullen een tweede leven.',
            ru: 'Дайте вашим вещам вторую жизнь.',
            ar: 'امنح أشياءك حياة ثانية.',
            zh: '让您的物品获得第二次生命。',
            ja: 'あなたのアイテムに第二の命を。',
            ko: '물건에 두 번째 삶을 주세요.',
            hi: 'अपनी वस्तुओं को दूसरा जीवन दें।',
        }
    },
    {
        section: 'sustainability', key: 'clutter_treasure',
        values: {
            en: "Someone's clutter is another person's treasure. Selling your unused items extends their lifecycle and keeps them out of landfills. Join the circular economy today.",
            fr: "Les déchets des uns font les trésors des autres. Vendre vos objets inutilisés prolonge leur durée de vie. Rejoignez l'économie circulaire aujourd'hui.",
            de: "Der Kram des einen ist der Schatz des anderen. Das Verkaufen ungenutzter Artikel verlängert deren Lebenszyklus. Werden Sie Teil der Kreislaufwirtschaft.",
            es: "La basura de uno es el tesoro de otro. Vender tus artículos sin usar extiende su ciclo de vida. Únete a la economía circular hoy.",
            it: "Il disordine di qualcuno è il tesoro di un altro. Vendere gli oggetti inutilizzati ne prolunga il ciclo di vita. Unisciti all'economia circolare oggi.",
            pt: "O lixo de alguém é o tesouro de outra pessoa. Vender seus itens não utilizados estende seu ciclo de vida. Junte-se à economia circular hoje.",
            nl: "Iemands rommel is iemand anders zijn schat. Het verkopen van ongebruikte spullen verlengt hun levenscyclus. Doe vandaag mee aan de circulaire economie.",
            ru: "Хлам одного — сокровище другого. Продажа неиспользуемых вещей продлевает их жизненный цикл. Присоединяйтесь к круговой экономике сегодня.",
            ar: "فضلات أحدهم هي كنز الآخر. يساهم بيع الأشياء في إطالة دورة حياتها. انضم إلى الاقتصاد الدائري اليوم.",
            zh: "一个人的杂乱是另一个人的宝藏。出售闲置物品可以延长其生命周期。今天就加入循环经济。",
            ja: "ある人のガラクタは別の人の宝物。使わないものを売ることでライフサイクルを延ばせます。今日から循環型経済に参加しましょう。",
            ko: "한 사람의 잡동사니가 다른 사람의 보물이 됩니다. 사용하지 않는 물건을 팔면 수명이 연장됩니다. 지금 순환 경제에 참여하세요.",
            hi: "किसी की बेकार चीज़ किसी के लिए खजाना बन सकती है। अनुपयोगी वस्तुओं को बेचने से उनका जीवनकाल बढ़ता है। आज ही सर्कुलर इकॉनमी से जुड़ें।",
        }
    },
    {
        section: 'sustainability', key: 'start_selling',
        values: {
            en: 'Start Selling Now',
            fr: 'Commencer à vendre maintenant',
            de: 'Jetzt mit dem Verkaufen beginnen',
            es: 'Empieza a vender ahora',
            it: 'Inizia a vendere adesso',
            pt: 'Comece a vender agora',
            nl: 'Begin nu met verkopen',
            ru: 'Начать продавать сейчас',
            ar: 'ابدأ البيع الآن',
            zh: '现在开始销售',
            ja: '今すぐ販売を開始する',
            ko: '지금 판매 시작하기',
            hi: 'अभी बेचना शुरू करें',
        }
    },
];

const seed = async () => {
    try {
        await connectDB();

        for (const item of allContent) {
            // Build $set payload with dot notation for Map fields
            const setPayload = {};
            for (const [lang, text] of Object.entries(item.values)) {
                setPayload[`values.${lang}`] = text;
            }

            const result = await FrontendContent.findOneAndUpdate(
                { section: item.section, key: item.key },
                { $set: setPayload },
                { upsert: true, new: true }
            );

            // Verify it saved by reading back
            const saved = Object.fromEntries(result.values);
            const langCount = Object.keys(saved).length;
            console.log(`✅ ${item.section}.${item.key} — ${langCount} languages saved`);
        }

        console.log('\n🎉 All translations saved in DB successfully!');
        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('ERROR:', err);
        process.exit(1);
    }
};

seed();
