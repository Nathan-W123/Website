'use client';

/**
 * The little me: black ink on white paper, same hand as the rest of the site.
 * He walks in from off the left edge, stops in the middle, and waves.
 *
 * Everything moves in CSS rather than JS so the whole thing is one element you
 * can drop anywhere — the timings live in chibi.css next to the keyframes they
 * belong to. Limbs are nested groups that all pivot about the same shoulder or
 * hip point, which is what lets the walk swing and the wave ride on top of each
 * other without either one having to know about the other.
 */
export function Chibi({ className = '' }: { className?: string }) {
  return (
    <div className={`cb-stage ${className}`}>
      <div className="cb-walker">
        <div className="cb-bob">
          <svg className="cb-art" viewBox="0 0 200 300">
            <title>A small cartoon of me walking in and waving</title>
            <g
              fill="none"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* the ground he lands on, so he isn't floating */}
              <ellipse className="cb-shadow" cx="100" cy="282" rx="46" ry="7" stroke="none" />

              {/* back leg, then front leg: the back one is drawn first so the
                  front one overlaps it at the hip */}
              <g className="cb-leg cb-leg-back">
                <path d="M114 218 L116 262" strokeWidth="15" />
                <path d="M116 266 L132 266" strokeWidth="13" />
              </g>
              <g className="cb-leg cb-leg-front">
                <path d="M86 218 L84 262" strokeWidth="15" />
                <path d="M84 266 L68 266" strokeWidth="13" />
              </g>

              {/* torso */}
              <path d="M70 158 Q70 150 84 148 L116 148 Q130 150 130 158 L134 214 Q134 224 122 224 L78 224 Q66 224 66 214 Z" fill="#fff" />

              {/* the arm on his left — plain swing, nothing clever */}
              <g className="cb-arm cb-arm-l">
                <path d="M72 163 L58 221" strokeWidth="14" />
                <circle cx="57" cy="227" r="9" fill="#fff" />
              </g>

              {/* neck */}
              <path d="M92 142 L92 152 M108 142 L108 152" strokeWidth="6" />

              <g className="cb-head">
                {/* ears */}
                <circle cx="51" cy="100" r="8" fill="#fff" />
                <circle cx="149" cy="100" r="8" fill="#fff" />

                {/* face */}
                <circle cx="100" cy="97" r="50" fill="#fff" />

                {/* hair: a heavy fringe with one bit that will not lie down */}
                <path
                  d="M50 102 C45 52 70 28 100 28 C131 28 155 53 150 102 C147 84 139 73 127 70 C116 86 94 89 76 80 C65 85 55 92 50 102 Z"
                  fill="currentColor"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path d="M95 32 C89 17 101 9 110 6 C102 17 106 27 112 33 Z" fill="currentColor" stroke="currentColor" strokeWidth="3" />

                {/* glasses */}
                <circle cx="79" cy="104" r="17" fill="#fff" />
                <circle cx="121" cy="104" r="17" fill="#fff" />
                <path d="M96 103 L104 103" strokeWidth="4" />
                <path d="M62 101 L54 99 M138 101 L146 99" strokeWidth="4" />

                {/* eyes and a small smile */}
                <circle className="cb-eye" cx="79" cy="105" r="6" fill="currentColor" stroke="none" />
                <circle className="cb-eye" cx="121" cy="105" r="6" fill="currentColor" stroke="none" />
                <path d="M89 126 Q100 136 111 126" strokeWidth="4.5" />
              </g>

              {/* The waving arm, drawn last so the raised hand clears the head.
                  Four nested groups about two pivots: the walk swing and the
                  raise turn the whole arm about the shoulder, the bend and the
                  wave turn the forearm about the elbow. Straight while he
                  walks, bent at the elbow once he stops. */}
              <g className="cb-arm cb-arm-r">
                <g className="cb-arm-raise">
                  <path d="M128 163 L142 196" strokeWidth="14" />
                  <g className="cb-forearm">
                    <g className="cb-arm-wave">
                      <path d="M142 196 L153 221" strokeWidth="13" />
                      <g className="cb-hand">
                        <circle cx="155" cy="227" r="9" fill="#fff" />
                        <path d="M149 222 L147 215" strokeWidth="4" />
                        <path d="M155 220 L155 212" strokeWidth="4" />
                        <path d="M161 222 L163 215" strokeWidth="4" />
                      </g>
                    </g>
                  </g>
                </g>
              </g>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}

export default Chibi;
