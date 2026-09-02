import { benchmarks } from '../lib/session';
import { useStore } from '../lib/store';
import { parseStore } from '../lib/storage';
import { Button, Label, Rule } from './ui';
import type { StoreDoc } from '../lib/types';

function download(doc: StoreDoc) {
  const blob = new Blob([JSON.stringify(doc, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download =
    'drill-record-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

export default function Export({ onClose }: { onClose(): void }) {
  const { doc, markExported, replaceDoc } = useStore();
  const marks = benchmarks(doc);

  const restore = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseStore(String(reader.result));
      if (!parsed) {
        window.alert('That file is not a drill record.');
        return;
      }
      if (
        window.confirm(
          'Replace the local record (' +
            doc.records.length +
            ' runs) with this file (' +
            parsed.records.length +
            ' runs)?',
        )
      ) {
        replaceDoc(parsed);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center gap-10 px-6 py-16">
      <div className="flex flex-col gap-6">
        <Label>Benchmarks</Label>
        <div className="flex gap-16">
          <figure className="flex flex-col gap-2">
            <div className="font-mono text-6xl tabular-nums">
              {marks.digitSpan ?? '—'}
            </div>
            <figcaption className="text-sm text-rule">
              Maximum digit span backwards
            </figcaption>
          </figure>
          <figure className="flex flex-col gap-2">
            <div className="font-mono text-6xl tabular-nums">
              {marks.rotation ?? '—'}
            </div>
            <figcaption className="text-sm text-rule">
              Mental rotation, correct in 3:00
            </figcaption>
          </figure>
        </div>
      </div>

      <Rule />

      <div className="flex flex-col gap-4">
        <Label>Full record</Label>
        <p className="max-w-prose text-sm text-rule">
          {doc.records.length} runs. The browser is the only copy; a cleared
          site setting loses all of it.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Button
            onClick={() => {
              download(doc);
              markExported();
            }}
          >
            Download JSON
          </Button>
          <label className="cursor-pointer border border-rule px-5 py-2 text-rule hover:border-graphite hover:text-graphite">
            Restore from file
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) restore(f);
                e.target.value = '';
              }}
            />
          </label>
        </div>
      </div>

      <Rule />

      <div>
        <Button onClick={onClose} hint="esc">
          Back
        </Button>
      </div>
    </div>
  );
}
