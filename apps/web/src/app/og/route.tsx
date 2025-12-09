import { ImageResponse } from "next/og";

// const goshaSansRegular = fetch(
//     new URL("../../../public/fonts/PPGoshaSans-Regular.otf", import.meta.url),
// ).then((res) => res.arrayBuffer());

// const goshaSansBold = fetch(
//     new URL("../../../public/fonts/PPGoshaSans-Bold.otf", import.meta.url),
// ).then((res) => res.arrayBuffer());

// instead of fetching, can we just read the files directly?
import fs from "fs";
import path from "path";

const goshaSansRegular = fs.promises.readFile(
    path.join(process.cwd(), "public", "fonts", "PPGoshaSans-Regular.otf"),
);

const goshaSansBold = fs.promises.readFile(
    path.join(process.cwd(), "public", "fonts", "PPGoshaSans-Bold.otf"),
);

export async function GET() {
    const goshaSansRegularData = await goshaSansRegular;
    const goshaSansBoldData = await goshaSansBold;
    return new ImageResponse(
        (
            <div
                style={{
                    height: "100%",
                    width: "100%",
                    display: "flex",
                    position: "relative",
                    backgroundColor: "hsl(224, 71.4%, 4.1%)",
                    color: "hsl(210, 20%, 98%)",
                    overflow: "hidden",
                }}
            >
                {/* Single Grid Background */}
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        opacity: 0.05,
                        backgroundImage: `
                            linear-gradient(hsl(210, 20%, 98%) 1px, transparent 1px),
                            linear-gradient(90deg, hsl(210, 20%, 98%) 1px, transparent 1px)
                        `,
                        backgroundSize: "80px 90px",
                    }}
                />

                {/* Brutalist Rectangles */}
                <div
                    style={{
                        position: "absolute",
                        top: "60px",
                        right: "60px",
                        width: "240px",
                        height: "80px",
                        backgroundColor: "hsl(210, 20%, 98%)",
                        opacity: 0.03,
                    }}
                />
                <div
                    style={{
                        position: "absolute",
                        bottom: "140px",
                        left: "600px",
                        width: "160px",
                        height: "60px",
                        backgroundColor: "hsl(210, 20%, 98%)",
                        opacity: 0.04,
                    }}
                />

                {/* Main Content Container */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        padding: "120px 80px",
                        width: "100%",
                        position: "relative",
                    }}
                >
                    {/* Title Section */}
                    <div
                        style={{
                            fontSize: "150px",
                            fontFamily: "PPGoshaSans",
                            fontWeight: 700,
                            lineHeight: 1,
                            letterSpacing: "-0.02em",
                            color: "hsl(210, 20%, 98%)",
                            // textTransform: "uppercase",
                            marginBottom: "80px",
                        }}
                    >
                        SoundStats
                    </div>

                    {/* Accent Bar */}
                    <div
                        style={{
                            width: "120px",
                            height: "6px",
                            backgroundColor: "hsl(210, 20%, 98%)",
                            marginBottom: "32px",
                        }}
                    />

                    {/* Description */}
                    <div
                        style={{
                            fontSize: "40px",
                            fontFamily: "PPGoshaSans",
                            fontWeight: 400,
                            lineHeight: 1.3,
                            letterSpacing: "0em",
                            color: "hsl(210, 20%, 78%)",
                            textTransform: "uppercase",
                            maxWidth: "700px",
                        }}
                    >
                        YOUR MUSIC STATISTICS DASHBOARD
                    </div>
                </div>

                {/* Brutalist Accent Element */}
                <div
                    style={{
                        position: "absolute",
                        bottom: "80px",
                        right: "80px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                    }}
                >
                    <div
                        style={{
                            width: "80px",
                            height: "8px",
                            backgroundColor: "hsl(210, 20%, 98%)",
                        }}
                    />
                    <div
                        style={{
                            width: "60px",
                            height: "8px",
                            backgroundColor: "hsl(210, 20%, 98%)",
                        }}
                    />
                    <div
                        style={{
                            width: "40px",
                            height: "8px",
                            backgroundColor: "hsl(210, 20%, 98%)",
                        }}
                    />
                </div>
            </div>
        ),
        {
            width: 1200,
            height: 630,
            fonts: [
                {
                    name: "PPGoshaSans",
                    data: goshaSansRegularData,
                    style: "normal",
                    weight: 400,
                },
                {
                    name: "PPGoshaSans",
                    data: goshaSansBoldData,
                    style: "normal",
                    weight: 700,
                },
            ],
            headers: {
                "Cache-Control": "public, max-age=0, s-maxage=86400",
            },
        },
    );
}
