"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useState, useEffect } from "react";
import { abi } from "./abi";

// TODO: replace with your deployed contract address after running:
// forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY --broadcast
const CONTRACT_ADDRESS = "0xEe48C3e3226f13d92C781FaF045b40439A3308f1" as `0x${string}`;
const NOT_DEPLOYED = CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000";

// ─── CreatePoll ────────────────────────────────────────────────────────────────

function CreatePoll() {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [durationHours, setDurationHours] = useState(24);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function addOption() {
    if (options.length < 10) setOptions([...options, ""]);
  }
  function removeOption(i: number) {
    if (options.length > 2) setOptions(options.filter((_, idx) => idx !== i));
  }
  function updateOption(i: number, val: string) {
    const next = [...options];
    next[i] = val;
    setOptions(next);
  }

  function handleCreate() {
    const validOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || validOptions.length < 2) return;
    writeContract(
      {
        address: CONTRACT_ADDRESS,
        abi,
        functionName: "createPoll",
        args: [question.trim(), validOptions, BigInt(durationHours * 3600)],
      },
      {
        onSuccess: (txHash) => {
          // poll ID shown after confirmation in the receipt — for now we reset the form
          setCreatedId(txHash);
          setQuestion("");
          setOptions(["", ""]);
        },
      }
    );
  }

  return (
    <section className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
      <h2 className="text-xl font-bold mb-4 text-indigo-400">Create a Poll</h2>

      <label className="block text-sm text-slate-400 mb-1">Question</label>
      <input
        className="w-full bg-slate-800 rounded-lg px-3 py-2 text-white mb-4 border border-slate-700 focus:outline-none focus:border-indigo-500"
        placeholder="What's your favourite framework?"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />

      <label className="block text-sm text-slate-400 mb-2">
        Options <span className="text-slate-500">(min 2, max 10)</span>
      </label>
      {options.map((opt, i) => (
        <div key={i} className="flex gap-2 mb-2">
          <input
            className="flex-1 bg-slate-800 rounded-lg px-3 py-2 text-white border border-slate-700 focus:outline-none focus:border-indigo-500"
            placeholder={`Option ${i + 1}`}
            value={opt}
            onChange={(e) => updateOption(i, e.target.value)}
          />
          {options.length > 2 && (
            <button
              onClick={() => removeOption(i)}
              className="text-slate-500 hover:text-red-400 px-2 text-lg"
            >
              ✕
            </button>
          )}
        </div>
      ))}
      {options.length < 10 && (
        <button
          onClick={addOption}
          className="text-indigo-400 hover:text-indigo-300 text-sm mb-4"
        >
          + Add option
        </button>
      )}

      <label className="block text-sm text-slate-400 mb-1 mt-2">
        Duration: <span className="text-white font-semibold">{durationHours}h</span>
      </label>
      <input
        type="range"
        min={1}
        max={168}
        value={durationHours}
        onChange={(e) => setDurationHours(Number(e.target.value))}
        className="w-full mb-4 accent-indigo-500"
      />

      <button
        onClick={handleCreate}
        disabled={isPending || isConfirming || NOT_DEPLOYED}
        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-xl py-3 font-semibold transition-colors"
      >
        {isPending ? "Check wallet…" : isConfirming ? "Confirming…" : "Create Poll"}
      </button>

      {isSuccess && (
        <p className="mt-3 text-green-400 text-sm text-center">
          ✅ Poll created! Check your tx in Etherscan.
        </p>
      )}
    </section>
  );
}

// ─── PollViewer (vote + results) ───────────────────────────────────────────────

function PollViewer() {
  const { address } = useAccount();
  const [pollIdInput, setPollIdInput] = useState("");
  const [activePollId, setActivePollId] = useState<bigint | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const { data: pollData } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: "polls",
    args: activePollId !== null ? [activePollId] : undefined,
    query: { enabled: activePollId !== null },
  });

  const { data: options } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: "getOptions",
    args: activePollId !== null ? [activePollId] : undefined,
    query: { enabled: activePollId !== null },
  });

  const { data: results, refetch: refetchResults } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: "getResults",
    args: activePollId !== null ? [activePollId] : undefined,
    query: { enabled: activePollId !== null },
  });

  const { data: alreadyVoted, refetch: refetchVoted } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: "hasVoted",
    args: activePollId !== null && address ? [activePollId, address] : undefined,
    query: { enabled: activePollId !== null && !!address },
  });

  const { data: active } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: "isActive",
    args: activePollId !== null ? [activePollId] : undefined,
    query: { enabled: activePollId !== null },
  });

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) {
      refetchResults();
      refetchVoted();
    }
  }, [isSuccess]);

  function handleLoad() {
    const id = parseInt(pollIdInput);
    if (!isNaN(id) && id >= 0) setActivePollId(BigInt(id));
  }

  function handleVote() {
    if (activePollId === null || selectedOption === null) return;
    writeContract({
      address: CONTRACT_ADDRESS,
      abi,
      functionName: "vote",
      args: [activePollId, BigInt(selectedOption)],
    });
  }

  const poll = pollData as [string, bigint, `0x${string}`, boolean] | undefined;
  const totalVotes = results
    ? (results as bigint[]).reduce((sum, v) => sum + Number(v), 0)
    : 0;

  const deadline = poll ? new Date(Number(poll[1]) * 1000) : null;

  return (
    <section className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
      <h2 className="text-xl font-bold mb-4 text-indigo-400">View & Vote</h2>

      <div className="flex gap-2 mb-4">
        <input
          className="flex-1 bg-slate-800 rounded-lg px-3 py-2 text-white border border-slate-700 focus:outline-none focus:border-indigo-500"
          placeholder="Poll ID (e.g. 0)"
          value={pollIdInput}
          onChange={(e) => {
            setPollIdInput(e.target.value);
            setActivePollId(null);
            setSelectedOption(null);
          }}
        />
        <button
          onClick={handleLoad}
          className="bg-slate-700 hover:bg-slate-600 rounded-lg px-4 font-semibold transition-colors"
        >
          Load
        </button>
      </div>

      {poll && poll[3] /* exists */ && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">{poll[0]}</h3>
          <p className="text-xs text-slate-500 mb-4">
            {active ? `⏳ Open until ${deadline?.toLocaleString()}` : "🔒 Voting closed"}
          </p>

          {/* Options with results */}
          <div className="space-y-3 mb-4">
            {(options as string[] | undefined)?.map((opt, i) => {
              const votes = results ? Number((results as bigint[])[i]) : 0;
              const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
              return (
                <button
                  key={i}
                  onClick={() => active && !alreadyVoted && setSelectedOption(i)}
                  className={`w-full text-left rounded-xl border p-3 transition-colors ${
                    selectedOption === i
                      ? "border-indigo-500 bg-indigo-950"
                      : "border-slate-700 hover:border-slate-500"
                  } ${!active || alreadyVoted ? "cursor-default" : "cursor-pointer"}`}
                >
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white font-medium">{opt}</span>
                    <span className="text-slate-400">
                      {votes} vote{votes !== 1 ? "s" : ""} · {pct}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {active && !alreadyVoted && address && (
            <button
              onClick={handleVote}
              disabled={selectedOption === null || isPending || isConfirming || NOT_DEPLOYED}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-xl py-3 font-semibold transition-colors"
            >
              {isPending ? "Check wallet…" : isConfirming ? "Confirming…" : "Cast Vote"}
            </button>
          )}
          {alreadyVoted && (
            <p className="text-center text-slate-400 text-sm">You already voted on this poll.</p>
          )}
          {!address && active && (
            <p className="text-center text-slate-400 text-sm">Connect your wallet to vote.</p>
          )}
          {isSuccess && (
            <p className="mt-3 text-green-400 text-sm text-center">✅ Vote recorded on-chain!</p>
          )}
        </div>
      )}

      {activePollId !== null && poll && !poll[3] && (
        <p className="text-slate-400 text-sm">Poll #{activePollId.toString()} does not exist.</p>
      )}
    </section>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-white">
            🗳️ OnChainPoll
          </h1>
          <p className="text-xs text-slate-500">Censorship-resistant voting on Ethereum</p>
        </div>
        <ConnectButton />
      </header>

      {/* Deploy banner */}
      {NOT_DEPLOYED && (
        <div className="max-w-4xl mx-auto px-6 mt-4">
          <div className="bg-yellow-950 border border-yellow-800 rounded-xl px-4 py-3 text-yellow-300 text-sm">
            ⚠️ Contract not deployed yet. Deploy to Sepolia and update{" "}
            <code className="font-mono bg-yellow-900 px-1 rounded">CONTRACT_ADDRESS</code> in{" "}
            <code className="font-mono bg-yellow-900 px-1 rounded">app/page.tsx</code>.
          </div>
        </div>
      )}

      {/* Main */}
      <main className="max-w-4xl mx-auto px-6 py-8 grid md:grid-cols-2 gap-6">
        <CreatePoll />
        <PollViewer />
      </main>

      {/* Footer */}
      <footer className="text-center text-slate-600 text-xs py-8">
        Built with Solidity + Foundry + Next.js · Sepolia testnet ·{" "}
        <a
          href="https://github.com/Armando8a-dev/onchain-poll"
          className="hover:text-slate-400 underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
      </footer>
    </div>
  );
}
