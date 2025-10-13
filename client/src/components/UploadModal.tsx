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
  Badge,
  ThemeIcon,
  Tooltip,
  rem,
} from "@mantine/core";
import { Dropzone, MIME_TYPES } from "@mantine/dropzone";
import type { FileWithPath } from "@mantine/dropzone";
import {
  IconUpload,
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
  mp3: number | null;
  wav: number | null;
  stems: number | null;
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
  const { uploadBeat } = useApp();

  const [title, setTitle] = useState("");
  const [scale, setScale] = useState("Am");
  const [bpm, setBpm] = useState<number | "">("");
  const [priceMp3, setPriceMp3] = useState<number | "">("");
  const [priceWav, setPriceWav] = useState<number | "">("");
  const [priceStems, setPriceStems] = useState<number | "">("");

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
  const [priceMp3Err, setPriceMp3Err] = useState(false);
  const [priceWavErr, setPriceWavErr] = useState(false);
  const [priceStemsErr, setPriceStemsErr] = useState(false);

  useEffect(() => {
    if (!opened) return;

    setTitle("");
    setScale("Am");
    setBpm("");
    setPriceMp3("");
    setPriceWav("");
    setPriceStems("");
    setFiles({ cover: null, mp3: null, wav: null, stems: null });
    setCoverStatus("idle");
    setMp3Status("idle");
    setWavStatus("idle");
    setStemsStatus("idle");
    setTitleErr(false);
    setBpmErr(false);
    setPriceMp3Err(false);
    setPriceWavErr(false);
    setPriceStemsErr(false);
  }, [opened]);

  const setFile = (key: keyof UploadFiles, value: File | null) => {
    setFiles((prev) => ({ ...prev, [key]: value }));
  };

  const onDrop = (dropped: FileWithPath[]) => {
    let coverLoaded = false;
    let mp3Loaded = false;
    let wavLoaded = false;
    let stemsLoaded = false;

    setFiles((prev) => {
      const next = { ...prev };

      dropped.forEach((file) => {
        const name = file.name.toLowerCase();
        const type = file.type;

        if (!next.cover && type.startsWith("image/")) {
          next.cover = file;
          coverLoaded = true;
          return;
        }

        if (!next.mp3 && (type === "audio/mpeg" || name.endsWith(".mp3"))) {
          next.mp3 = file;
          mp3Loaded = true;
          return;
        }

        if (
          !next.wav &&
          (type === "audio/wav" ||
            type === "audio/x-wav" ||
            name.endsWith(".wav"))
        ) {
          next.wav = file;
          wavLoaded = true;
          return;
        }

        if (
          !next.stems &&
          (name.includes("stem") ||
            name.endsWith(".zip") ||
            type === "application/zip")
        ) {
          next.stems = file;
          stemsLoaded = true;
        }
      });

      return next;
    });

    if (coverLoaded) setCoverStatus("ok");
    if (mp3Loaded) setMp3Status("ok");
    if (wavLoaded) setWavStatus("ok");
    if (stemsLoaded) setStemsStatus("ok");
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

  const validate = () => {
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
    const bpmValid = bpmValue !== null && bpmValue >= 30 && bpmValue <= 240;
    setBpmErr(!bpmValid);
    valid = valid && bpmValid;

    const prices: UploadPrices = {
      mp3: parseNumeric(priceMp3),
      wav: parseNumeric(priceWav),
      stems: parseNumeric(priceStems),
    };

    const mp3Valid = prices.mp3 !== null && prices.mp3 > 0;
    const wavValid = prices.wav !== null && prices.wav > 0;
    const stemsValid = prices.stems !== null && prices.stems > 0;
    setPriceMp3Err(!mp3Valid);
    setPriceWavErr(!wavValid);
    setPriceStemsErr(!stemsValid);
    valid = valid && mp3Valid && wavValid && stemsValid;

    return { valid, bpmValue, prices };
  };

  const handleSubmit = async () => {
    const { valid, bpmValue, prices } = validate();
    if (
      !valid ||
      bpmValue === null ||
      prices.mp3 === null ||
      prices.wav === null ||
      prices.stems === null
    ) {
      return;
    }

    try {
      await uploadBeat({
        title: title.trim(),
        key: scale,
        bpm: bpmValue,
        prices,
        files,
      });
      onClose();
    } catch (error) {
      console.error("Upload failed", error);
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
          maxHeight: "90vh",
          display: "flex",
        },
        body: {
          padding: 0,
          display: "flex",
          flex: 1,
        },
      }}
    >
      <GlassCard
        style={{
          position: "relative",
          color: "#fff",
          padding: 0,
          width: "100%",
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
          style={{ flex: 1 }}
          type="auto"
          scrollbarSize={6}
          offsetScrollbars
          styles={{
            viewport: {
              padding: `${rem(26)} ${rem(24)} ${rem(24)}`,
              boxSizing: "border-box",
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
          <Stack gap="lg">
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
                  Загрузить новый бит
                </Text>
                <Text
                  size="sm"
                  style={{
                    color: "var(--muted)",
                    fontFamily: FONT_FAMILY,
                    fontWeight: FONT_WEIGHT,
                  }}
                >
                  Добавьте обложку, аудио-файлы и цены для вашего трека
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

            <Box style={sectionSurface}>
              <Stack gap="sm">
                <Dropzone
                  onDrop={onDrop}
                  multiple
                  maxSize={500 * 1024 * 1024}
                  accept={{
                    [MIME_TYPES.png]: [".png"],
                    [MIME_TYPES.jpeg]: [".jpg", ".jpeg"],
                    [MIME_TYPES.webp]: [".webp"],
                    "audio/mpeg": [".mp3"],
                    "audio/wav": [".wav"],
                    "application/zip": [".zip"],
                  }}
                  styles={{
                    root: {
                      background: "rgba(255,255,255,0.03)",
                      border: "2px dashed rgba(110,107,255,0.3)",
                      borderRadius: rem(12),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: `${rem(24)} ${rem(16)}`,
                      fontFamily: FONT_FAMILY,
                      fontWeight: FONT_WEIGHT,
                      transition: "all 250ms ease",
                      cursor: "pointer",
                      "&:hover": {
                        background: "rgba(110,107,255,0.05)",
                        borderColor: "rgba(110,107,255,0.5)",
                        boxShadow: "0 0 20px rgba(110,107,255,0.15)",
                      },
                    },
                  }}
                >
                  <Stack gap={8} align="center">
                    <ThemeIcon
                      size={48}
                      radius="xl"
                      style={{
                        background: ACCENT_GRADIENT,
                        boxShadow: ACCENT_GLOW,
                        border: "none",
                      }}
                    >
                      <IconUpload size={22} />
                    </ThemeIcon>
                    <Text
                      size="sm"
                      c="var(--text)"
                      ta="center"
                      fw={500}
                      style={{
                        fontFamily: FONT_FAMILY,
                        fontWeight: FONT_WEIGHT,
                      }}
                    >
                      Перетащите файлы сюда или
                      <Text
                        span
                        fw={600}
                        style={{
                          background: ACCENT_GRADIENT,
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          backgroundClip: "text",
                        }}
                      >
                        &nbsp;выберите
                      </Text>
                    </Text>
                    <Text
                      size="xs"
                      c="var(--muted)"
                      ta="center"
                      style={{
                        fontFamily: FONT_FAMILY,
                        fontWeight: FONT_WEIGHT,
                        fontSize: "12px",
                      }}
                    >
                      PNG, JPG, WEBP, MP3, WAV, ZIP • До 500 MB на файл
                    </Text>
                  </Stack>
                </Dropzone>

                <Box
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                    gap: rem(8),
                    width: "100%",
                  }}
                >
                  <Indicator label="Artwork *" status={coverStatus} />
                  <Indicator label="MP3 *" status={mp3Status} />
                  <Indicator label="WAV *" status={wavStatus} />
                  <Indicator
                    label="STEMS (optional)"
                    status={stemsStatus}
                    optional
                  />
                </Box>

                <Stack gap={6}>
                  <UploadedRow
                    label="Artwork"
                    icon="cover"
                    file={files.cover}
                    status={coverStatus}
                    onRemove={() => removeFile("cover")}
                  />
                  <UploadedRow
                    label="MP3"
                    icon="mp3"
                    file={files.mp3}
                    status={mp3Status}
                    onRemove={() => removeFile("mp3")}
                  />
                  <UploadedRow
                    label="WAV"
                    icon="wav"
                    file={files.wav}
                    status={wavStatus}
                    onRemove={() => removeFile("wav")}
                  />
                  <UploadedRow
                    label="STEMS"
                    icon="stems"
                    file={files.stems}
                    status={stemsStatus}
                    onRemove={() => removeFile("stems")}
                  />
                </Stack>
              </Stack>
            </Box>

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
                    label="Тональность"
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
                    onChange={(value) => setScale(value || "Am")}
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
                  <NumberInput
                    size="sm"
                    label="BPM *"
                    value={bpm}
                    min={30}
                    max={240}
                    onChange={(value) =>
                      setBpm(value === "" ? "" : Number(value))
                    }
                    hideControls
                    error={bpmErr ? " " : undefined}
                    withErrorStyles={false}
                    styles={getControlStyles(bpmErr)}
                  />
                </Group>

                <Group grow gap="sm">
                  <NumberInput
                    size="sm"
                    label="Цена MP3 *"
                    value={priceMp3}
                    onChange={(value) =>
                      setPriceMp3(value === "" ? "" : Number(value))
                    }
                    min={0}
                    hideControls
                    leftSection={
                      <Badge
                        variant="light"
                        style={{
                          background: ACCENT_GRADIENT,
                          color: "#fff",
                          border: "none",
                        }}
                      >
                        $
                      </Badge>
                    }
                    error={priceMp3Err ? " " : undefined}
                    withErrorStyles={false}
                    styles={getControlStyles(priceMp3Err)}
                  />
                  <NumberInput
                    size="sm"
                    label="Цена WAV *"
                    value={priceWav}
                    onChange={(value) =>
                      setPriceWav(value === "" ? "" : Number(value))
                    }
                    min={0}
                    hideControls
                    leftSection={
                      <Badge
                        variant="light"
                        style={{
                          background: ACCENT_GRADIENT,
                          color: "#fff",
                          border: "none",
                        }}
                      >
                        $
                      </Badge>
                    }
                    error={priceWavErr ? " " : undefined}
                    withErrorStyles={false}
                    styles={getControlStyles(priceWavErr)}
                  />
                  <NumberInput
                    size="sm"
                    label="Цена STEMS *"
                    value={priceStems}
                    onChange={(value) =>
                      setPriceStems(value === "" ? "" : Number(value))
                    }
                    min={0}
                    hideControls
                    leftSection={
                      <Badge
                        variant="light"
                        style={{
                          background: ACCENT_GRADIENT,
                          color: "#fff",
                          border: "none",
                        }}
                      >
                        $
                      </Badge>
                    }
                    error={priceStemsErr ? " " : undefined}
                    withErrorStyles={false}
                    styles={getControlStyles(priceStemsErr)}
                  />
                </Group>
              </Stack>
            </Box>

            <NeonButton
              onClick={handleSubmit}
              size="md"
              style={{
                width: "100%",
                fontSize: rem(15),
                fontWeight: 600,
                height: rem(44),
              }}
            >
              Опубликовать
            </NeonButton>
          </Stack>
        </ScrollArea>
      </GlassCard>
    </Modal>
  );
}

function Indicator({
  label,
  status,
  optional,
}: {
  label: string;
  status: IndicatorStatus;
  optional?: boolean;
}) {
  const isOk = status === "ok";
  const isError = status === "error";

  const icon = isOk ? <IconCheck size={16} /> : null;

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
    <Tooltip
      label={
        optional
          ? "Опциональный файл"
          : isError
            ? "Добавьте этот файл"
            : undefined
      }
      disabled={!isError && !optional}
      withArrow
      offset={6}
      styles={{
        tooltip: {
          background: "rgba(20,20,20,0.95)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.1)",
          fontSize: rem(12),
        },
      }}
    >
      <Stack
        gap={6}
        align="center"
        justify="center"
        style={{
          width: "100%",
          textAlign: "center",
          fontFamily: FONT_FAMILY,
          fontWeight: FONT_WEIGHT,
        }}
      >
        <ThemeIcon
          radius="xl"
          size={32}
          variant="light"
          color={isOk || isError ? "blue" : "gray"}
          style={{
            ...indicatorStyles,
            transition: "all 250ms ease",
          }}
        >
          {icon}
        </ThemeIcon>
        <Text
          fz="xs"
          fw={500}
          style={{
            color: isOk ? "#fff" : isError ? "#ffb3b3" : "var(--muted)",
            fontFamily: FONT_FAMILY,
            fontWeight: FONT_WEIGHT,
            transition: "color 250ms ease",
          }}
        >
          {label}
        </Text>
      </Stack>
    </Tooltip>
  );
}

function UploadedRow({
  label,
  file,
  status,
  icon,
  onRemove,
}: {
  label: string;
  file: File | null;
  status?: IndicatorStatus;
  icon?: "cover" | "mp3" | "wav" | "stems";
  onRemove: () => void;
}) {
  if (!file) return null;

  const leftIcon =
    icon === "cover" ? (
      <IconPhoto size={16} />
    ) : icon === "mp3" ? (
      <IconMusic size={16} />
    ) : icon === "wav" ? (
      <IconWaveSine size={16} />
    ) : icon === "stems" ? (
      <IconStack2 size={16} />
    ) : (
      <IconMusic size={16} />
    );

  return (
    <Box
      style={{
        border: "1px solid rgba(255,255,255,0.1)",
        background:
          status === "ok"
            ? "rgba(110,107,255,0.08)"
            : "rgba(255,255,255,0.04)",
        borderRadius: rem(10),
        padding: rem(12),
        fontFamily: FONT_FAMILY,
        transition: "all 250ms ease",
      }}
    >
      <Group justify="space-between" wrap="nowrap">
        <Group gap={10}>
          <ThemeIcon
            variant="light"
            color={status === "ok" ? "blue" : "gray"}
            size={36}
            radius="md"
            style={{
              background:
                status === "ok"
                  ? ACCENT_GRADIENT
                  : status === "error"
                    ? INDICATOR_ERROR_BG
                    : "rgba(255,255,255,0.06)",
              border:
                status === "error"
                  ? `1px solid ${ERROR_BORDER}`
                  : "none",
              boxShadow:
                status === "ok"
                  ? ACCENT_GLOW
                  : status === "error"
                    ? ERROR_GLOW
                    : "none",
              transition: "all 250ms ease",
            }}
          >
            {leftIcon}
          </ThemeIcon>
          <div>
            <Text
              fz="sm"
              fw={600}
              c={status === "ok" ? "#fff" : "var(--text)"}
              style={{
                fontFamily: FONT_FAMILY,
                fontWeight: FONT_WEIGHT + 100,
              }}
            >
              {label}
            </Text>
            <Text
              fz="xs"
              c="var(--muted)"
              style={{
                fontFamily: FONT_FAMILY,
                fontWeight: FONT_WEIGHT,
                marginTop: rem(2),
              }}
            >
              {file.name}
            </Text>
          </div>
        </Group>
        <Button
          size="compact-sm"
          variant="subtle"
          onClick={onRemove}
          color="red"
          styles={{
            root: {
              fontFamily: FONT_FAMILY,
              fontWeight: FONT_WEIGHT,
              "&:hover": {
                background: "rgba(255,107,107,0.15)",
              },
            },
          }}
        >
          <IconX size={16} />
        </Button>
      </Group>
    </Box>
  );
}
