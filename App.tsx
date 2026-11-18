import { useEffect, useRef, useState } from "react";
import { Alert, Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Speech from "expo-speech";
import { WORDS } from "./words";

type CardState = { b: number; d: number };
type Store = Record<number, CardState>;
type Screen = "home" | "review" | "list" | "done";

const KEY = "leitner_ciudad_v1";
const INT = [1, 2, 4, 8, 16];
const COL = ["#fb7185", "#fbbf24", "#4ade80", "#3ee6f5", "#a78bfa"];
const ICO = ["📮", "📦", "🗃️", "🗄️", "🏆"];

const C = {
  bg: "#0d0718", card: "#1d1236", line: "#3a2b5c", tx: "#f3eefc", mut: "#a99dc6",
  cy: "#3ee6f5", gold: "#ffc857", violet: "#7c3aed",
};

const today = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 864e5);
const fa = (n: number) => n.toLocaleString("fa-IR");
const shuffle = <T,>(a: T[]) => {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const speak = (t: string) => {
  Speech.stop();
  Speech.speak(t, { language: "es-ES", rate: 0.85 });
};

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SafeAreaView style={s.root} edges={["top", "bottom"]}>
        <Game />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function Game() {
  const [store, setStore] = useState<Store>({});
  const [loaded, setLoaded] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");
  const [queue, setQueue] = useState<number[]>([]);
  const [qi, setQi] = useState(0);
  const [mode, setMode] = useState<"due" | "free">("due");
  const [, setTick] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => { if (v) setStore(JSON.parse(v)); })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const card = (i: number): CardState => store[i] ?? { b: 1, d: today() };
  const persist = (next: Store) => {
    setStore(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  };
  const dueList = () => WORDS.map((_, i) => i).filter((i) => card(i).d <= today());

  const start = (m: "due" | "free") => {
    setMode(m);
    setQueue(m === "due" ? shuffle(dueList()) : shuffle(WORDS.map((_, i) => i)));
    setQi(0);
    setScreen("review");
  };

  const answer = (ok: boolean) => {
    if (mode === "due") {
      const i = queue[qi];
      const c = card(i);
      const b = ok ? Math.min(5, c.b + 1) : 1;
      const d = ok ? today() + INT[b - 1] : today() + 1;
      persist({ ...store, [i]: { b, d } });
    }
    if (qi + 1 >= queue.length) setScreen("done");
    else setQi(qi + 1);
  };

  const reset = () =>
    Alert.alert("شروع دوباره", "همه پیشرفت پاک شود؟", [
      { text: "نه", style: "cancel" },
      { text: "پاک کن", style: "destructive", onPress: () => { persist({}); setTick((x) => x + 1); } },
    ]);

  if (!loaded) return <View style={s.root} />;

  if (screen === "review")
    return (
      <Review
        key={qi}
        index={queue[qi]}
        pos={qi}
        total={queue.length}
        box={card(queue[qi]).b}
        onClose={() => setScreen("home")}
        onAnswer={answer}
      />
    );

  if (screen === "done")
    return (
      <View style={[s.wrap, { flex: 1, justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ fontSize: 80 }}>🎉</Text>
        <Text style={s.h1}>آفرین!</Text>
        <Text style={s.note}>مرور تمام شد.{"\n"}فردا برای کارت‌های جدید برگرد.</Text>
        <Btn label="بازگشت به جعبه‌ها" onPress={() => setScreen("home")} style={{ alignSelf: "stretch" }} />
      </View>
    );

  if (screen === "list") {
    const t = today();
    return (
      <ScrollView contentContainerStyle={s.wrap}>
        <View style={s.top}>
          <Pressable style={s.back} onPress={() => setScreen("home")}><Text style={s.tx}>➜ بازگشت</Text></Pressable>
          <Text style={[s.h1, { fontSize: 20, marginTop: 0 }]}>📚 همه لغات</Text>
        </View>
        {WORDS.map((w, i) => {
          const c = card(i), df = c.d - t;
          return (
            <View key={i} style={s.item}>
              <Text style={{ fontSize: 26 }}>{w[3]}</Text>
              <View style={{ flex: 1 }}>
                <Text onPress={() => speak(w[0])} style={[s.es, { fontSize: 16 }]}>{w[0]} 🔊</Text>
                <Text style={[s.mut, s.rtl]}>{w[1]}</Text>
              </View>
              <Text style={[s.pill, { color: COL[c.b - 1] }]}>
                جعبه {fa(c.b)} · {df <= 0 ? "امروز" : `${fa(df)} روز دیگر`}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    );
  }

  const t = today(), due = dueList(), cnt = [0, 0, 0, 0, 0];
  WORDS.forEach((_, i) => cnt[card(i).b - 1]++);
  let next: number | null = null;
  WORDS.forEach((_, i) => { const x = card(i).d; if (x > t && (next === null || x < next)) next = x; });

  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <Text style={s.h1}>🏙️ Ciudad o Pueblo 🏡</Text>
      <Text style={[s.note, { textAlign: "right", marginBottom: 18 }]}>فلش‌کارت لغات به روش جعبه لایتنر</Text>

      <View style={s.row}>
        <Stat n={due.length} label="برای مرور امروز" color={C.cy} />
        <Stat n={WORDS.length} label="کل لغات" />
        <Stat n={cnt[4]} label="یادگرفته‌شده 🏆" />
      </View>

      <View style={[s.row, { gap: 6 }]}>
        {cnt.map((c, i) => (
          <View key={i} style={[s.box, { borderBottomColor: COL[i] }]}>
            <Text style={{ fontSize: 22 }}>{ICO[i]}</Text>
            <Text style={[s.tx, { fontSize: 20, fontWeight: "800" }]}>{fa(c)}</Text>
            <Text style={s.small}>جعبه {fa(i + 1)}</Text>
            <Text style={s.small}>هر {fa(INT[i])} روز</Text>
          </View>
        ))}
      </View>

      <Btn label={`▶ شروع مرور امروز (${fa(due.length)} کارت)`} onPress={() => start("due")} disabled={!due.length} />
      {!due.length && (
        <Text style={s.note}>
          🎉 امروز کارتی برای مرور نیست.{next !== null ? `\nمرور بعدی ${fa((next as number) - t)} روز دیگر است.` : ""}
        </Text>
      )}
      <Btn label="🔁 تمرین آزاد همه کارت‌ها" onPress={() => start("free")} color={C.gold} />
      <Btn label="📚 فهرست لغات و وضعیت هر کارت" onPress={() => setScreen("list")} ghost />
      <Btn label="♻️ شروع دوباره (پاک کردن پیشرفت)" onPress={reset} ghost />
      <Text style={s.note}>
        پاسخ درست ⬅ کارت به جعبه بعدی می‌رود و دیرتر برمی‌گردد.{"\n"}پاسخ غلط ⬅ کارت به جعبه ۱ برمی‌گردد.
      </Text>
    </ScrollView>
  );
}

function Review(p: { index: number; pos: number; total: number; box: number; onClose: () => void; onAnswer: (ok: boolean) => void }) {
  const w = WORDS[p.index];
  const [flipped, setFlipped] = useState(false);
  const rot = useRef(new Animated.Value(0)).current;

  const flip = () => {
    setFlipped(true);
    Animated.timing(rot, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    speak(w[0]);
  };
  const front = rot.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const back = rot.interpolate({ inputRange: [0, 1], outputRange: ["180deg", "360deg"] });

  return (
    <View style={[s.wrap, { flex: 1 }]}>
      <View style={s.top}>
        <Pressable style={s.back} onPress={p.onClose}><Text style={s.tx}>✕</Text></Pressable>
        <View style={s.bar}><View style={[s.barFill, { width: `${(p.pos / p.total) * 100}%` }]} /></View>
        <Text style={s.mut}>{fa(p.pos + 1)}/{fa(p.total)}</Text>
      </View>

      <View style={{ height: 360, marginBottom: 14 }}>
        <Animated.View style={[s.face, s.front, { transform: [{ perspective: 1200 }, { rotateY: front }] }]}>
          <Text style={s.tag}>جعبه {fa(p.box)}</Text>
          <Text style={{ fontSize: 58, marginBottom: 6 }}>{w[3]}</Text>
          <Pressable onPress={() => speak(w[0])} style={{ alignItems: "center" }}>
            <Text style={[s.es, { fontSize: 32, textAlign: "center" }]}>{w[0]}</Text>
            <Text style={{ color: C.cy, fontSize: 13, marginTop: 4 }}>🔊 برای شنیدن تلفظ بزن</Text>
          </Pressable>
          <Text style={[s.small, { marginTop: 14, fontSize: 12 }]}>معنی را به خاطر بیاور، بعد کارت را بچرخان</Text>
        </Animated.View>

        <Animated.View style={[s.face, s.backFace, { transform: [{ perspective: 1200 }, { rotateY: back }] }]}>
          <Text style={s.tag}>جعبه {fa(p.box)}</Text>
          <Text onPress={() => speak(w[0])} style={[s.es, { fontSize: 20 }]}>{w[0]} 🔊</Text>
          <Text style={{ fontSize: 30, fontWeight: "800", color: C.gold, marginVertical: 2, textAlign: "center" }}>{w[1]}</Text>
          <Text style={{ fontSize: 15, color: C.cy, marginBottom: 12 }}>{w[2]}</Text>
          <View style={s.ex}>
            <Text onPress={() => speak(w[4])} style={[s.es, { fontSize: 16, fontWeight: "400", lineHeight: 24 }]}>{w[4]} 🔊</Text>
            <Text style={[s.mut, s.rtl, { marginTop: 4, fontSize: 14 }]}>{w[5]}</Text>
          </View>
        </Animated.View>
      </View>

      {!flipped ? (
        <Btn label="🔄 نمایش پاسخ" onPress={flip} />
      ) : (
        <View style={[s.row, { gap: 10 }]}>
          <Btn label="😕 بلد نبودم" onPress={() => p.onAnswer(false)} color="#f43f5e" textColor="#fff" style={{ flex: 1 }} />
          <Btn label="😎 بلد بودم" onPress={() => p.onAnswer(true)} color="#22d3a0" style={{ flex: 1 }} />
        </View>
      )}
    </View>
  );
}

function Stat({ n, label, color = C.gold }: { n: number; label: string; color?: string }) {
  return (
    <View style={s.stat}>
      <Text style={{ fontSize: 26, fontWeight: "800", color }}>{fa(n)}</Text>
      <Text style={s.small}>{label}</Text>
    </View>
  );
}

function Btn(p: { label: string; onPress: () => void; color?: string; textColor?: string; ghost?: boolean; disabled?: boolean; style?: object }) {
  return (
    <Pressable
      onPress={p.onPress}
      disabled={p.disabled}
      style={({ pressed }) => [
        s.btn,
        p.ghost ? s.ghost : { backgroundColor: p.color ?? C.cy },
        { opacity: p.disabled ? 0.45 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
        p.style,
      ]}
    >
      <Text style={{ color: p.ghost ? C.tx : p.textColor ?? "#14082b", fontWeight: p.ghost ? "600" : "800", fontSize: 16, textAlign: "center" }}>
        {p.label}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  wrap: { padding: 16, paddingBottom: 40 },
  h1: { fontSize: 26, fontWeight: "800", color: C.cy, marginTop: 6, textAlign: "right" },
  tx: { color: C.tx },
  mut: { color: C.mut, fontSize: 13 },
  rtl: { writingDirection: "rtl", textAlign: "right" },
  small: { fontSize: 11, color: C.mut, textAlign: "center" },
  note: { textAlign: "center", color: C.mut, fontSize: 13, marginVertical: 8, lineHeight: 24, writingDirection: "rtl" },
  es: { color: "#fff", fontWeight: "800", writingDirection: "ltr" },
  row: { flexDirection: "row-reverse", gap: 10, marginBottom: 16 },
  stat: { flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 16, paddingVertical: 12, alignItems: "center" },
  box: { flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderBottomWidth: 4, borderRadius: 14, paddingVertical: 8, alignItems: "center" },
  btn: { borderRadius: 16, padding: 15, marginBottom: 10 },
  ghost: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  top: { flexDirection: "row-reverse", alignItems: "center", gap: 10, marginBottom: 14 },
  back: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14 },
  bar: { flex: 1, height: 10, backgroundColor: C.card, borderRadius: 9, overflow: "hidden", transform: [{ scaleX: -1 }] },
  barFill: { height: "100%", backgroundColor: C.cy },
  face: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 26, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center", padding: 22, backfaceVisibility: "hidden" },
  front: { backgroundColor: "#2a1650" },
  backFace: { backgroundColor: "#10304a" },
  tag: { position: "absolute", top: 12, right: 14, fontSize: 11, color: C.gold, backgroundColor: "rgba(0,0,0,0.35)", borderRadius: 20, paddingVertical: 3, paddingHorizontal: 10, overflow: "hidden" },
  ex: { backgroundColor: "rgba(0,0,0,0.28)", borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 12, alignSelf: "stretch" },
  item: { flexDirection: "row-reverse", alignItems: "center", gap: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 10, marginBottom: 8 },
  pill: { fontSize: 11, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
});
