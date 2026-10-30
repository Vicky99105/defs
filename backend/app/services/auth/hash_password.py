"""Make a value for AUTH_PASSWORD_HASH.

    uv run python -m app.services.auth.hash_password

Reads the password twice without echo and prints only the hash.
"""

import getpass
import sys

from app.services.auth.service import hash_password


def main(iterations: int = 600_000) -> None:
    password = getpass.getpass("Password: ")
    if not password:
        sys.exit("The password must not be empty.")
    if getpass.getpass("Repeat password: ") != password:
        sys.exit("The passwords do not match.")
    print(hash_password(password, iterations=iterations))


if __name__ == "__main__":
    main()
