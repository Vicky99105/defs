from fastapi import Response

# Past Elexon data does not change, so the CDN may keep a public response for a day
# and serve a stale copy for a week while it revalidates.
PUBLIC_CACHE_CONTROL = "public, s-maxage=86400, stale-while-revalidate=604800"

# Responses behind sign-in. "private" stops the shared CDN from storing them, so a
# cached copy can never reach a caller without a token. The browser may keep one an hour.
PRIVATE_CACHE_CONTROL = "private, max-age=3600"


def set_public_cache(response: Response) -> None:
    response.headers["Cache-Control"] = PUBLIC_CACHE_CONTROL


def set_private_cache(response: Response) -> None:
    response.headers["Cache-Control"] = PRIVATE_CACHE_CONTROL
