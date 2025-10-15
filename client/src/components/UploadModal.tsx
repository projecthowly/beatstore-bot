import { useEffect, useState } from "react";
import {
  Modal,
  Group,
  Text,
  Box,
  Button,
  Stack,
  ScrollArea,
  TextInput,
  NumberInput,
  Select,
  ThemeIcon,
  rem,
} from "@mantine/core";
import { Dropzone, MIME_TYPES } from "@mantine/dropzone";
import {
  IconCheck,
  IconX,
  IconMusic,
  IconWaveSine,
  IconStack2,
  IconPhoto,
} from "@tabler/icons-react";
import { GlassCard, NeonButton } from "../ui/Glass";
import { useApp } from "../store";
import "../assets/fonts/unbounded.css";

type Props = { opened: boolean; onClose: () => void };
type IndicatorStatus = "idle" | "ok" | "error";

type UploadPrices = {
  [licenseId: string]: number | null;
};

type UploadFiles = {
  cover: File | null;
  mp3: File | null;
  wav: File | null;
  stems: File | null;
};

const sectionSurface = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: rem(12),
  padding: rem(16),
  boxShadow: "0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)",
};

const FONT_FAMILY =
  'Unbounded, "Inter", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
const FONT_WEIGHT = 400;
const ACCENT_GRADIENT = "linear-gradient(90deg, #6E6BFF, #2EA1FF)";
const ACCENT_GLOW = "0 4px 20px rgba(110, 107, 255, 0.4)";
const ERROR_BORDER = "rgba(255,107,107,0.5)";
const ERROR_GLOW = "0 0 12px rgba(255,107,107,0.3)";
const INDICATOR_ERROR_BG = "rgba(255,107,107,0.12)";

export default function UploadModal({ opened, onClose }: Props) {
  const { uploadBeat, licenses } = useApp();

  const [step, setStep] = useState<1 | 2>(1); // ✅ Шаг 1: метаданные, Шаг 2: цены
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("left");
  const [title, setTitle] = useState("");
  const [scale, setScale] = useState<string | null>(null); // ✅ Нет дефолтного значения
  const [bpm, setBpm] = useState<number | "">("");
  const [prices, setPrices] = useState<Record<string, number | "">>({});

  const [files, setFiles] = useState<UploadFiles>({
    cover: null,
    mp3: null,
    wav: null,
    stems: null,
  });

  const [coverStatus, setCoverStatus] = useState<IndicatorStatus>("idle");
  const [mp3Status, setMp3Status] = useState<IndicatorStatus>("idle");
  const [wavStatus, setWavStatus] = useState<IndicatorStatus>("idle");
  const [stemsStatus, setStemsStatus] = useState<IndicatorStatus>("idle");

  const [titleErr, setTitleErr] = useState(false);
  const [bpmErr, setBpmErr] = useState(false);
  const [priceErrors, setPriceErrors] = useState<Record<string, boolean>>({});

  // Инициализация цен из лицензий при открытии модального окна
  useEffect(() => {
    if (!opened) return;

    setStep(1); // ✅ Сбрасываем на первый шаг
    setTitle("");
    setScale(null); // ✅ Сбрасываем на null
    setBpm("");

    // Инициализируем цены из defaultPrice лицензий
    const initialPrices: Record<string, number | ""> = {};
    licenses.forEach((license) => {
      initialPrices[license.id] = license.defaultPrice ?? "";
    });
    setPrices(initialPrices);

    setFiles({ cover: null, mp3: null, wav: null, stems: null });
    setCoverStatus("idle");
    setMp3Status("idle");
    setWavStatus("idle");
    setStemsStatus("idle");
    setTitleErr(false);
    setBpmErr(false);
    setPriceErrors({});
  }, [opened, licenses]);

  const setFile = (key: keyof UploadFiles, value: File | null) => {
    setFiles((prev) => ({ ...prev, [key]: value }));
  };

  const removeFile = (key: keyof UploadFiles) => {
    setFile(key, null);
    switch (key) {
      case "cover":
        setCoverStatus("idle");
        break;
      case "mp3":
        setMp3Status("idle");
        break;
      case "wav":
        setWavStatus("idle");
        break;
      case "stems":
        setStemsStatus("idle");
        break;
    }
  };

  const parseNumeric = (value: number | ""): number | null => {
    if (value === "") return null;
    const numeric = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numeric)) return null;
    return numeric;
  };

  const getControlStyles = (invalid: boolean) => ({
    wrapper: {
      "--input-margin-bottom": rem(0),
    },
    label: {
      color: "var(--text)",
      fontFamily: FONT_FAMILY,
      fontWeight: FONT_WEIGHT,
      fontSize: rem(14),
      marginBottom: rem(6),
    },
    input: {
      color: "var(--text)",
      fontFamily: FONT_FAMILY,
      border: invalid
        ? `1px solid ${ERROR_BORDER}`
        : "1px solid rgba(255,255,255,0.1)",
      boxShadow: invalid ? ERROR_GLOW : "none",
      backgroundColor: "rgba(255,255,255,0.04)",
      transition: "all 200ms ease",
      borderRadius: rem(10),
      "&::placeholder": {
        color: "#9AA0B3 !important",
        opacity: "0.6 !important",
      },
      "&::-webkit-input-placeholder": {
        color: "#9AA0B3 !important",
        opacity: "0.6 !important",
      },
      "&::-moz-placeholder": {
        color: "#9AA0B3 !important",
        opacity: "0.6 !important",
      },
      "&:-ms-input-placeholder": {
        color: "#9AA0B3 !important",
        opacity: "0.6 !important",
      },
      "&:focus": {
        borderColor: invalid ? ERROR_BORDER : "rgba(110,107,255,0.5)",
        boxShadow: invalid
          ? ERROR_GLOW
          : "0 0 0 2px rgba(110,107,255,0.15), 0 0 12px rgba(110,107,255,0.2)",
        backgroundColor: "rgba(255,255,255,0.06)",
      },
      "&:hover": {
        backgroundColor: "rgba(255,255,255,0.06)",
        borderColor: invalid ? ERROR_BORDER : "rgba(255,255,255,0.15)",
      },
    },
    error: {
      display: "none",
      height: 0,
      margin: 0,
      padding: 0,
    },
  });

  const validateStep1 = () => {
    let valid = true;

    if (!files.cover) {
      setCoverStatus("error");
      valid = false;
    }
    if (!files.mp3) {
      setMp3Status("error");
      valid = false;
    }
    if (!files.wav) {
      setWavStatus("error");
      valid = false;
    }

    const titleValid = Boolean(title.trim());
    setTitleErr(!titleValid);
    valid = valid && titleValid;

    const bpmValue = parseNumeric(bpm);
    const bpmValid = bpmValue !== null && bpmValue > 0 && bpmValue <= 999;
    setBpmErr(!bpmValid);
    valid = valid && bpmValid;

    return { valid, bpmValue };
  };

  const validateStep2 = () => {
    let valid = true;
    const uploadPrices: UploadPrices = {};
    const newPriceErrors: Record<string, boolean> = {};

    licenses.forEach((license) => {
      const priceValue = parseNumeric(prices[license.id] || "");
      uploadPrices[license.id] = priceValue;

      const priceValid = priceValue !== null && priceValue > 0;
      newPriceErrors[license.id] = !priceValid;

      if (!priceValid) {
        valid = false;
      }
    });

    setPriceErrors(newPriceErrors);

    return { valid, prices: uploadPrices };
  };

  const handleNextStep = () => {
    const { valid } = validateStep1();
    if (valid && scale) {
      setSlideDirection("left");
      setTimeout(() => setStep(2), 0);
    }
  };

  const handleBackStep = () => {
    setSlideDirection("right");
    setTimeout(() => setStep(1), 0);
  };

  const handleSubmit = async () => {
    console.log("🔵 handleSubmit вызван");

    const { valid: step1Valid, bpmValue } = validateStep1();
    console.log("🔵 step1Valid:", step1Valid, "bpmValue:", bpmValue);

    const { valid: step2Valid, prices: uploadPrices } = validateStep2();
    console.log("🔵 step2Valid:", step2Valid, "uploadPrices:", uploadPrices);
    console.log("🔵 scale:", scale);

    if (!step1Valid || !step2Valid || !scale || bpmValue === null) {
      console.log("❌ Валидация не прошла:", {
        step1Valid,
        step2Valid,
        scale,
        bpmValue,
      });
      return;
    }

    console.log("✅ Валидация прошла, начинаем загрузку");

    try {
      await uploadBeat({
        title: title.trim(),
        key: scale,
        bpm: bpmValue,
        prices: uploadPrices,
        files,
      });
      console.log("✅ Загрузка завершена успешно");
      onClose();
    } catch (error) {
      console.error("❌ Upload failed", error);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      size="auto"
      withCloseButton={false}
      padding="lg"
      styles={{
        overlay: {
          background: "rgba(7, 8, 12, 0.78)",
          backdropFilter: "blur(8px)",
        },
        content: {
          background: "transparent",
          border: "none",
          boxShadow: "none",
          padding: rem(0),
          width: "min(820px, 98vw)",
          maxWidth: "98vw",
          maxHeight: "90vh",
          display: "flex",
          overflow: "hidden",
        },
        body: {
          padding: 0,
          display: "flex",
          flex: 1,
          overflow: "hidden",
        },
      }}
    >
      <GlassCard
        style={{
          position: "relative",
          color: "#fff",
          padding: 0,
          width: "100%",
          maxWidth: "100%",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          fontFamily: FONT_FAMILY,
          fontWeight: FONT_WEIGHT,
          overflow: "hidden",
        }}
      >
        <ScrollArea
          style={{ flex: 1, minHeight: rem(500), maxWidth: "100%" }}
          type="auto"
          scrollbarSize={6}
          offsetScrollbars
          styles={{
            viewport: {
              padding: `${rem(26)} ${rem(24)} ${rem(24)}`,
              boxSizing: "border-box",
              maxWidth: "100%",
            },
            scrollbar: {
              background: "transparent",
              borderRadius: rem(10),
              transition: "opacity 180ms ease",
              '&[data-state="hidden"]': { opacity: 0, pointerEvents: "none" },
            },
            thumb: {
              background:
                "linear-gradient(180deg, rgba(110, 107, 255, 0.45), rgba(46, 161, 255, 0.35))",
              borderRadius: rem(10),
              border: "1px solid rgba(110, 107, 255, 0.25)",
              boxShadow: "0 0 8px rgba(110, 107, 255, 0.2)",
              transition: "all 0.2s ease",
              "&:hover": {
                background:
                  "linear-gradient(180deg, rgba(110, 107, 255, 0.65), rgba(46, 161, 255, 0.55))",
                boxShadow: "0 0 12px rgba(110, 107, 255, 0.4)",
              },
            },
            corner: { display: "none" },
          }}
        >
          <Box
            key={step}
            style={{
              animation:
                slideDirection === "left"
                  ? "slideInFromRight 300ms cubic-bezier(0.4, 0, 0.2, 1)"
                  : "slideInFromLeft 300ms cubic-bezier(0.4, 0, 0.2, 1)",
              maxWidth: "100%",
              overflow: "hidden",
            }}
          >
            <Stack gap="lg" style={{ maxWidth: "100%" }}>
            <Group justify="space-between" align="flex-start">
              <Stack gap={4}>
                <Text
                  fw={600}
                  fz="xl"
                  style={{
                    color: "var(--text)",
                    fontFamily: FONT_FAMILY,
                    fontSize: rem(22),
                  }}
                >
                  {step === 1 ? "Загрузить новый бит" : "Укажите цены"}
                </Text>
                <Text
                  size="sm"
                  style={{
                    color: "var(--muted)",
                    fontFamily: FONT_FAMILY,
                    fontWeight: FONT_WEIGHT,
                  }}
                >
                  {step === 1
                    ? "Добавьте обложку, аудио-файлы и метаданные"
                    : "Установите цены для каждой лицензии"}
                </Text>
              </Stack>
              <Button
                size="compact-sm"
                variant="subtle"
                onClick={onClose}
                color="gray"
                styles={{
                  root: {
                    fontFamily: FONT_FAMILY,
                    fontWeight: FONT_WEIGHT,
                    "&:hover": {
                      background: "rgba(255,255,255,0.08)",
                    },
                  },
                }}
              >
                <IconX size={18} />
              </Button>
            </Group>

            {step === 1 && (
              <Box style={sectionSurface}>
                <Stack gap="sm">
                  <FileDropzoneRow
                    label="Artwork *"
                    icon="cover"
                    file={files.cover}
                    status={coverStatus}
                    accept={{
                      [MIME_TYPES.png]: [".png"],
                      [MIME_TYPES.jpeg]: [".jpg", ".jpeg"],
                      [MIME_TYPES.webp]: [".webp"],
                    }}
                    onDrop={(file) => {
                      setFile("cover", file);
                      setCoverStatus("ok");
                    }}
                    onRemove={() => removeFile("cover")}
                  />
                  <FileDropzoneRow
                    label="MP3 *"
                    icon="mp3"
                    file={files.mp3}
                    status={mp3Status}
                    accept={{
                      "audio/mpeg": [".mp3"],
                    }}
                    onDrop={(file) => {
                      setFile("mp3", file);
                      setMp3Status("ok");
                    }}
                    onRemove={() => removeFile("mp3")}
                  />
                  <FileDropzoneRow
                    label="WAV *"
                    icon="wav"
                    file={files.wav}
                    status={wavStatus}
                    accept={{
                      "audio/wav": [".wav"],
                      "audio/x-wav": [".wav"],
                    }}
                    onDrop={(file) => {
                      setFile("wav", file);
                      setWavStatus("ok");
                    }}
                    onRemove={() => removeFile("wav")}
                  />
                  <FileDropzoneRow
                    label="STEMS (optional)"
                    icon="stems"
                    file={files.stems}
                    status={stemsStatus}
                    accept={{
                      "application/zip": [".zip"],
                    }}
                    onDrop={(file) => {
                      setFile("stems", file);
                      setStemsStatus("ok");
                    }}
                    onRemove={() => removeFile("stems")}
                    optional
                  />
                </Stack>
              </Box>
            )}

            {step === 1 && (
              <Box style={sectionSurface}>
                <Stack gap="sm">
                  <TextInput
                    size="sm"
                    label="Название *"
                    placeholder="Введите название трека"
                    value={title}
                    onChange={(event) => setTitle(event.currentTarget.value)}
                    error={titleErr ? " " : undefined}
                    withErrorStyles={false}
                    styles={getControlStyles(titleErr)}
                  />

                  <Group grow gap="sm">
                  <Select
                    size="sm"
                    label="Тональность *"
                    searchable
                    data={[
                      "Am",
                      "A#m",
                      "Bm",
                      "Cm",
                      "C#m",
                      "Dm",
                      "D#m",
                      "Em",
                      "Fm",
                      "F#m",
                      "Gm",
                      "G#m",
                      "A",
                      "B",
                      "C",
                      "D",
                      "E",
                      "F",
                      "G",
                    ]}
                    value={scale}
                    onChange={(value) => setScale(value)}
                    styles={{
                      label: {
                        color: "var(--text)",
                        fontFamily: FONT_FAMILY,
                        fontWeight: FONT_WEIGHT,
                        fontSize: rem(14),
                        marginBottom: rem(6),
                      },
                      input: {
                        color: "var(--text)",
                        fontFamily: FONT_FAMILY,
                        fontWeight: FONT_WEIGHT,
                        backgroundColor: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: rem(10),
                        transition: "all 200ms ease",
                        "&:hover": {
                          backgroundColor: "rgba(255,255,255,0.06)",
                          borderColor: "rgba(255,255,255,0.15)",
                        },
                        "&:focus": {
                          borderColor: "rgba(110,107,255,0.5)",
                          boxShadow:
                            "0 0 0 2px rgba(110,107,255,0.15), 0 0 12px rgba(110,107,255,0.2)",
                          backgroundColor: "rgba(255,255,255,0.06)",
                        },
                      },
                      dropdown: {
                        background:
                          "linear-gradient(180deg, rgba(20,20,20,0.98), rgba(15,15,15,0.98))",
                        backdropFilter: "blur(20px)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: rem(10),
                        boxShadow: "0 8px 30px rgba(0,0,0,0.6)",
                        fontFamily: FONT_FAMILY,
                        fontWeight: FONT_WEIGHT,
                      },
                      option: {
                        fontFamily: FONT_FAMILY,
                        fontWeight: FONT_WEIGHT,
                        borderRadius: rem(6),
                        margin: rem(4),
                        "&[data-hovered]": {
                          background: "rgba(110,107,255,0.15)",
                        },
                        "&[data-selected]": {
                          background: ACCENT_GRADIENT,
                        },
                      },
                    }}
                  />
                  <TextInput
                    size="sm"
                    label="BPM *"
                    value={bpm}
                    onChange={(event) => {
                      const input = event.currentTarget.value;

                      // Разрешаем только цифры и запятую
                      const filtered = input.replace(/[^\d,]/g, "");

                      // Разрешаем только одну запятую
                      const parts = filtered.split(",");
                      if (parts.length > 2) return; // Больше одной запятой - игнорируем

                      const integerPart = parts[0] || "";
                      const decimalPart = parts[1];

                      // Проверяем что целая часть не больше 3 цифр
                      if (integerPart.length > 3) return; // Игнорируем ввод

                      // Собираем обратно значение
                      let value = integerPart;
                      if (parts.length === 2) {
                        value += "," + (decimalPart || "");
                      }

                      // Если строка пустая, ставим ""
                      if (value === "") {
                        setBpm("");
                      } else {
                        // Для хранения конвертируем запятую в точку
                        const numValue = parseFloat(value.replace(",", "."));
                        if (!isNaN(numValue) && numValue <= 999) {
                          setBpm(numValue);
                        } else if (value.endsWith(",")) {
                          // Разрешаем вводить запятую
                          setBpm(value as any);
                        }
                      }
                    }}
                    inputMode="decimal"
                    error={bpmErr ? " " : undefined}
                    withErrorStyles={false}
                    styles={getControlStyles(bpmErr)}
                  />
                </Group>
              </Stack>
            </Box>
            )}

            {step === 1 && (
              <NeonButton
                onClick={handleNextStep}
                size="md"
                style={{
                  width: "100%",
                  fontSize: rem(15),
                  fontWeight: 600,
                  height: rem(44),
                }}
              >
                Далее
              </NeonButton>
            )}

            {step === 2 && (
              <Box style={sectionSurface}>
                <Stack gap="sm">
                  <Group grow gap="sm">
                    {licenses.map((license) => (
                      <NumberInput
                        key={license.id}
                        size="sm"
                        label={`${license.name} *`}
                        value={prices[license.id] ?? ""}
                        onChange={(value) =>
                          setPrices((prev) => ({
                            ...prev,
                            [license.id]: value === "" ? "" : Number(value),
                          }))
                        }
                        min={0}
                        hideControls
                        leftSection={
                          <Text
                            size="xs"
                            fw={600}
                            style={{
                              color: "var(--muted)",
                              paddingLeft: rem(4),
                            }}
                          >
                            $
                          </Text>
                        }
                        error={priceErrors[license.id] ? " " : undefined}
                        withErrorStyles={false}
                        styles={getControlStyles(priceErrors[license.id] || false)}
                      />
                    ))}
                  </Group>
                </Stack>
              </Box>
            )}

            {step === 2 && (
              <Group gap="sm" grow>
                <Button
                  onClick={handleBackStep}
                  size="md"
                  variant="light"
                  style={{
                    fontSize: rem(15),
                    fontWeight: 600,
                    height: rem(44),
                  }}
                >
                  Назад
                </Button>
                <NeonButton
                  onClick={handleSubmit}
                  size="md"
                  style={{
                    fontSize: rem(15),
                    fontWeight: 600,
                    height: rem(44),
                  }}
                >
                  Опубликовать
                </NeonButton>
              </Group>
            )}
            </Stack>
          </Box>
        </ScrollArea>
      </GlassCard>
    </Modal>
  );
}

function FileDropzoneRow({
  label,
  icon,
  file,
  status,
  accept,
  onDrop,
  onRemove,
}: {
  label: string;
  icon: "cover" | "mp3" | "wav" | "stems";
  file: File | null;
  status: IndicatorStatus;
  accept: Record<string, string[]>;
  onDrop: (file: File) => void;
  onRemove: () => void;
  optional?: boolean;
}) {
  const isOk = status === "ok";
  const isError = status === "error";

  const leftIcon =
    icon === "cover" ? (
      <IconPhoto size={18} />
    ) : icon === "mp3" ? (
      <IconMusic size={18} />
    ) : icon === "wav" ? (
      <IconWaveSine size={18} />
    ) : icon === "stems" ? (
      <IconStack2 size={18} />
    ) : (
      <IconMusic size={18} />
    );

  const indicatorIcon = isOk ? <IconCheck size={18} /> : leftIcon;

  const indicatorStyles = isOk
    ? {
        background: ACCENT_GRADIENT,
        boxShadow: ACCENT_GLOW,
        color: "#fff",
        border: "none",
      }
    : isError
    ? {
        background: INDICATOR_ERROR_BG,
        boxShadow: ERROR_GLOW,
        color: "#ffb3b3",
        border: `1px solid ${ERROR_BORDER}`,
      }
    : {
        background: "rgba(255,255,255,0.05)",
        color: "var(--muted)",
        border: "1px solid rgba(255,255,255,0.1)",
      };

  return (
    <Stack gap="xs">
      {/* Заголовок с индикатором */}
      <Group gap="xs" wrap="nowrap" align="center">
        <ThemeIcon
          radius="xl"
          size={36}
          variant="light"
          style={{
            ...indicatorStyles,
            transition: "all 250ms ease",
            flexShrink: 0,
          }}
        >
          {indicatorIcon}
        </ThemeIcon>
        <Text
          fw={500}
          size="sm"
          style={{
            color: isOk ? "#fff" : isError ? "#ffb3b3" : "var(--text)",
            fontFamily: FONT_FAMILY,
            fontWeight: FONT_WEIGHT,
          }}
        >
          {label}
        </Text>
      </Group>

      {/* Dropzone или файл */}
      <Box
        style={{
          width: "100%",
          minHeight: rem(56),
        }}
      >
        {file ? (
          <Box
            style={{
              width: "100%",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(110,107,255,0.08)",
              borderRadius: rem(10),
              padding: `${rem(10)} ${rem(12)}`,
              fontFamily: FONT_FAMILY,
              transition: "all 250ms ease",
              minHeight: rem(56),
              display: "flex",
              alignItems: "center",
            }}
          >
            <Group justify="space-between" wrap="nowrap" gap="xs" style={{ width: "100%", minWidth: 0 }}>
              <Box style={{ flex: 1, minWidth: 0 }}>
                <Text
                  fz="sm"
                  fw={500}
                  c="var(--text)"
                  style={{
                    fontFamily: FONT_FAMILY,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    display: "block",
                    maxWidth: "100%",
                  }}
                >
                  {file.name}
                </Text>
              </Box>
              <Button
                size="compact-xs"
                variant="subtle"
                onClick={onRemove}
                color="red"
                styles={{
                  root: {
                    fontFamily: FONT_FAMILY,
                    fontWeight: FONT_WEIGHT,
                    flexShrink: 0,
                    "&:hover": {
                      background: "rgba(255,107,107,0.15)",
                    },
                  },
                }}
              >
                <IconX size={14} />
              </Button>
            </Group>
          </Box>
        ) : (
          <Dropzone
            onDrop={(files) => {
              if (files.length > 0) {
                onDrop(files[0]);
              }
            }}
            maxSize={500 * 1024 * 1024}
            accept={accept}
            multiple={false}
            styles={{
              root: {
                width: "100%",
                background: "rgba(255,255,255,0.03)",
                border: isError
                  ? `2px dashed ${ERROR_BORDER}`
                  : "2px dashed rgba(110,107,255,0.3)",
                borderRadius: rem(10),
                padding: rem(14),
                fontFamily: FONT_FAMILY,
                fontWeight: FONT_WEIGHT,
                transition: "all 250ms ease",
                cursor: "pointer",
                minHeight: rem(56),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                "&:hover": {
                  background: "rgba(110,107,255,0.05)",
                  borderColor: "rgba(110,107,255,0.5)",
                  boxShadow: "0 0 20px rgba(110,107,255,0.15)",
                },
              },
            }}
          >
            <Text
              size="sm"
              c="var(--muted)"
              ta="center"
              style={{
                fontFamily: FONT_FAMILY,
                fontWeight: FONT_WEIGHT,
                fontSize: rem(13),
              }}
            >
              Нажмите для выбора файла
            </Text>
          </Dropzone>
        )}
      </Box>
    </Stack>
  );
}
