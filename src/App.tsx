import { sessionMinutes } from './lib/session';
import { useStore } from './lib/store';
import { exportIsOverdue } from './lib/storage';
import { useSession } from './lib/useSession';
import { DRILLS, type DrillId, type DrillRecord } from './lib/types';
import { Button, KeyHint, Label, Rule, Stage, useKeys } from './components/ui';
import Export from './components/Export';
import DrillHost from './components/DrillHost';

export default function App() {
  const { doc, writeError } = useStore();
  const { screen, proposed, start, go, finishDrill, advance, currentLevel } =
    useSession();

  useKeys(
    (e) => {
      if (e.key === 'Enter') {
        if (screen.name === 'home') start(proposed);
        else if (screen.name === 'between') advance();
        else if (screen.name === 'done') go('home');
      } else if (e.key === 'Escape' && screen.name !== 'session') {
        go('home');
      }
    },
    [screen, proposed, start, advance, go],
  );

  if (screen.name === 'export') return <Export onClose={() => go('home')} />;

  if (screen.name === 'session') {
    const drill = screen.queue[screen.at]!;
    return (
      <DrillHost
        key={drill + ':' + screen.at}
        drill={drill}
        seed={screen.seed + ':' + screen.at}
        level={currentLevel(drill)}
        exposureMs={doc.visualMemory.exposureMs}
        onFinish={finishDrill}
      />
    );
  }

  if (screen.name === 'between') {
    const drill = screen.queue[screen.at]!;
    const next = screen.queue[screen.at + 1];
    return (
      <Stage>
        <div className="flex w-full max-w-md flex-col items-center gap-8">
          <Label>{DRILLS[drill].name}</Label>
          <div className="font-mono text-5xl tabular-nums">
            {formatLevel(drill, screen.last.level)}
          </div>
          <div className="text-sm text-rule">{DRILLS[drill].unit}</div>
          <Rule className="w-full" />
          <Button onClick={advance} hint="enter">
            {next ? DRILLS[next].name : 'Finish'}
          </Button>
        </div>
      </Stage>
    );
  }

  if (screen.name === 'done') {
    return (
      <Stage>
        <div className="flex w-full max-w-md flex-col items-center gap-8">
          <Label>Session complete</Label>
          <div className="flex w-full flex-col gap-2">
            {screen.queue.map((d) => (
              <div key={d} className="flex justify-between text-sm">
                <span>{DRILLS[d].name}</span>
                <span className="font-mono tabular-nums text-rule">
                  {lastLevel(doc.records, d)}
                </span>
              </div>
            ))}
          </div>
          <Rule className="w-full" />
          <Button onClick={() => go('home')} hint="enter">
            Done
          </Button>
        </div>
      </Stage>
    );
  }

  if (screen.name === 'picker') {
    return (
      <Stage>
        <div className="flex w-full max-w-md flex-col gap-4">
          <Label>Single drill</Label>
          {Object.values(DRILLS).map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => start([d.id])}
              className="border-b border-rule/40 py-3 text-left hover:text-signal"
            >
              {d.name}
            </button>
          ))}
          <Button onClick={() => go('home')} hint="esc">
            Back
          </Button>
        </div>
      </Stage>
    );
  }

  // Home. One key starts the proposed session; nothing else is in the way.
  return (
    <Stage>
      <div className="flex w-full max-w-md flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-3">
          <Label>Today · {sessionMinutes(proposed)} min</Label>
          <div className="flex flex-col items-center gap-1 pt-2">
            {proposed.map((d) => (
              <div key={d} className="text-lg">
                {DRILLS[d].name}
              </div>
            ))}
          </div>
        </div>

        <Button onClick={() => start(proposed)} hint="enter">
          Start
        </Button>

        {exportIsOverdue(doc) && (
          <button
            type="button"
            onClick={() => go('export')}
            className="border border-wrong px-4 py-2 text-sm text-wrong"
          >
            Record not exported in 14 days — download it
          </button>
        )}

        {writeError && (
          <div className="max-w-prose text-center text-sm text-wrong">
            Runs are not being saved: {writeError}
          </div>
        )}

        <Rule className="w-full" />
        <div className="flex gap-6 text-sm text-rule">
          <button
            type="button"
            className="hover:text-graphite"
            onClick={() => go('picker')}
          >
            Single drill
          </button>
          <button
            type="button"
            className="hover:text-graphite"
            onClick={() => go('export')}
          >
            Record
          </button>
        </div>
        <KeyHint>enter to start</KeyHint>
      </div>
    </Stage>
  );
}

function formatLevel(drill: DrillId, level: number): string {
  if (drill === 'attitude') return Math.round(level) + ' ms';
  return DRILLS[drill].staircased ? level.toFixed(1) : String(Math.round(level));
}

function lastLevel(records: readonly DrillRecord[], drill: DrillId): string {
  for (let i = records.length - 1; i >= 0; i--) {
    const r = records[i]!;
    if (r.drill === drill) return formatLevel(drill, r.level);
  }
  return '—';
}
