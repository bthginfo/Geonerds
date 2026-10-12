import { describe,expect,it } from "vitest";
import { guestCookieName,guestTokenHash,newGuestChallengeAccess,readGuestChallengeToken,validGuestChallengeToken } from "./geo-challenge-guest";
describe("isolated guest challenge access",()=>{
  it("generates unpredictable independent capabilities for different claims",()=>{
    const first=newGuestChallengeAccess("first");const second=newGuestChallengeAccess("second");
    expect(first.cookie.value).not.toBe(second.cookie.value);
    expect(first.cookie.name).not.toBe(second.cookie.name);
    expect(first.cookie.httpOnly).toBe(true);expect(first.cookie.path).toBe("/api/challenges/first");
    expect(validGuestChallengeToken(first.cookie.value,first.hash)).toBe(true);
    expect(validGuestChallengeToken(second.cookie.value,first.hash)).toBe(false);
  });
  it("reads only a valid cookie for the actual challenge",()=>{
    const token="a".repeat(64);
    const request=new Request("https://geo-nerds.com",{headers:{Cookie:`other=x; ${guestCookieName("first")}=${token}`}});
    expect(readGuestChallengeToken(request,"first")).toBe(token);
    expect(readGuestChallengeToken(request,"second")).toBeNull();
    expect(validGuestChallengeToken(null,guestTokenHash(token))).toBe(false);
    expect(validGuestChallengeToken(token,"not-a-hash")).toBe(false);
  });
});
