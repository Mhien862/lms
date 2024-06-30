import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import Mux from "@mux/mux-node";

const { video } = new Mux({
  tokenId: process.env["MUX_TOKEN_ID"],
  tokenSecret: process.env["MUX_TOKEN_SECRET"],
});

export async function DELETE(
  req: NextRequest,
  { params }: { params: { courseId: string; chapterId: string } }
) {
  try {
    if (!params.courseId || !params.chapterId) {
      return NextResponse.json(
        { message: "CourseId and ChapterId are required" },
        { status: 400 }
      );
    }

    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const res = await prisma.chapter.delete({
      where: {
        id: params.chapterId,
        courseId: params.courseId,
      },
    });

    return NextResponse.json(
      { message: "Chapter deleted", ...res },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { courseId: string; chapterId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (!params.courseId || !params.chapterId) {
      return NextResponse.json(
        { message: "CourseId and ChapterId are required" },
        { status: 400 }
      );
    }

    const value = await req.json();
    if (!value) {
      return NextResponse.json(
        { message: "field is required to update" },
        { status: 400 }
      );
    }
    const res = await prisma.chapter.update({
      where: {
        id: params.chapterId,
        courseId: params.courseId,
      },
      data: {
        ...value,
      },
    });

    if (value.videoUrl) {
      const existingMuxData = await prisma.muxVideo.findFirst({
        where: {
          chapterId: params.chapterId,
        },
      });

      // delete existing video
      if (existingMuxData) {
        await video.assets.delete(existingMuxData.assertId);
        await prisma.muxVideo.delete({
          where: {
            id: existingMuxData.id,
          },
        });
      }

      // create new video
      const asset = await video.assets.create({
        input: value.videoUrl,
        playback_policy: ["public"],
        test: false,
      });
      await prisma.muxVideo.create({
        data: {
          assertId: asset.id,
          chapterId: params.chapterId,
          videoUrl: value.videoUrl,
          playbackId: asset.playback_ids?.[0].id || "",
        },
      });
    }

    return NextResponse.json(
      { meage: "chapter updated...", ...res },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
