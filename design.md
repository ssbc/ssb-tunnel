
## design for private id

Alice, endpoint server connects to Bob, the portal, and _announces_ herself.
When Carol, endpoint client, connects to the portal
she _requests_ a tunnel to `Alice`.

## plain: no privacy

Announcement is implicit, just the id of the connection to Bob,
`Alice.id`.
Request is `{target: Alice.id}`

Alice's address is `tunnel:Bob.id:Alice.id`

* Alice's address reveals Bob's identity.
* someone could connect to Bob, and guess that alice is there.

## hmac1: hmac(Bob.id, Alice.id)

Announcement is implicit, Bob computes id as `hmac(Bob.id, Alice.id)`,
taking `Alice.id` from the connection.

Request is `{target: hmac(Bob.id, Alice.id)}`

* Alice's address does not reveal Bob's identity, but someone who
  knows Bob can confirm she refers to Bob - necessary to create connection!
* Someone else can guess she is at Bob, by connecting to Bob and requesting
  a tunnel to `hmac(Bob.id, Alice.id)`, even if they were not explicitly
  given Alice's address!

## hmac2: hmac(Bob.id, Alice.id, secret)

Announcement is `secret` and Alice's id is implicit, taken
from the connection, Bob then calculates `hmac(Bob.id, Alice.id, secret)`

Address is tunnel:hmac(Bob.id, Alice.id):secret

request is `{target: hmac(Bob.id, Alice.id, secret)}`

* address protects Bob's identity.
* somebody else cannot confirm Alice's portal, without knowing her address,
  because they must guess `secret`.
* If Carol requests a tunnel to Alice from Mallory (not Bob), then
  Mallory can now connect to Alice, via bob. Although, he doesn't know
  `secret`, and does not know identities.
  so he has to try every combination of peers.

## hmac3: hmac(Carol.id, hmac(bob.id, Alice.id), secret)

As with hmac2, but request is `{target: hmac(Carol.id, Bob.id, Alice.id, secret)}`

* address protects Bob's identity.
* somebody cannot confirm Alice's portal, without knowing her address.
* Alice and Bob's identities are not accidentially leaked to Mallory,
  because for Mallory to request tunnel to Alice, they would need to send
  `hmac(Mallory.id, Bob.id, Alice.id, secret)` and they do not know
  `Alice.id` or `secret`.
* Bob has the power to give out Alice's address. It would be neat if
  Bob didn't know Alice's address, but could verify that someone else
  knew it.

