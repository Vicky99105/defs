from fastapi import Response

# Past Elexon data does not change, so the CDN may keep a response for a day
# and serve a stale copy for a week while it revalidates.
PAST_DATA_CACHE_CONTROL = "public, s-maxage=86400, stale-while-revalidate=604800"


def set_past_data_cache(response: Response) -> None:
    response.headers["Cache-Control"] = PAST_DATA_CACHE_CONTROL
