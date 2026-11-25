import { SOURCE_CONTRACT, checkSourceMaterial, type SourceRequest } from "@/domain/source-material";
import { WATER_SAMPLE } from "./adapters";
const fronts = [
  "Which process changes liquid water into water vapor?",
  "Which process changes water vapor into liquid droplets?",
  "What is water falling from clouds called?",
  "Which process releases water vapor from plants?",
  "What supplies energy for evaporation in these notes?",
];
const answers = ["Evaporation", "Condensation", "Precipitation", "Transpiration", "Sunlight"];
export function sampleMaterial(request: SourceRequest) {
  if (request.source.kind !== "sample" || request.source.sampleId !== WATER_SAMPLE.id)
    throw new Error("Unknown sample");
  const paragraphs = WATER_SAMPLE.text.split("\n\n");
  const indices = request.source.segments.map((s) => {
    const i = paragraphs.indexOf(s.text);
    if (i < 0 || s.id !== `paragraph-${i + 1}`) throw new Error("Sample changed");
    return i;
  });
  const format = request.format;
  const output =
    format === "quiz"
      ? {
          format,
          questions: request.source.segments.map((s, j) => ({
            prompt: fronts[indices[j]!]!,
            options: [answers[indices[j]!]!, "Magnetism", "Sound reflection", "Rock erosion"].map(
              (text, i) => ({ id: ["a", "b", "c", "d"][i]!, text }),
            ),
            correctOptionId: "a",
            explanation: s.text,
            sources: [{ segmentId: s.id, excerpt: s.text }],
          })),
        }
      : format === "flashcards"
        ? {
            format,
            cards: request.source.segments.map((s, j) => ({
              front: fronts[indices[j]!]!,
              evidenceId: `${s.id}:s1`,
            })),
            excluded: [],
          }
        : {
            format,
            sections: [
              {
                heading: "Water cycle sample notes",
                points: request.source.segments.map((s) => ({ evidenceId: `${s.id}:s1` })),
              },
            ],
            terms: [],
            comparisons: [],
            excluded: [],
          };
  return checkSourceMaterial({
    contract: SOURCE_CONTRACT,
    id: `source-sample-${crypto.randomUUID()}`,
    title: request.source.title,
    createdAt: Date.now(),
    request,
    generation: {
      provider: "sample",
      model: "authored-water-cycle-v1",
      promptVersion: "source-evidence-v1",
      validationVersion: "single-answer-v1",
      reviewStatus: "authored-sample",
    },
    output,
  });
}
