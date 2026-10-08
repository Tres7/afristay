import dataclasses

import pytest

from apps.users.domain.value_objects.Email import Email
from apps.users.domain.value_objects.PasswordHash import PasswordHash
from apps.users.domain.value_objects.PhoneNumber import PhoneNumber


class TestEmail:
    def test_normalizes_whitespace_and_case(self):
        assert Email('  Ama.Kossi@Example.TG ').value == 'ama.kossi@example.tg'

    @pytest.mark.parametrize('invalid', ['ama.example.tg', 'ama@', 'ama@example', 'ama kossi@example.tg', ''])
    def test_rejects_invalid_addresses(self, invalid):
        with pytest.raises(ValueError):
            Email(invalid)

    def test_is_immutable(self):
        email = Email('ama@example.tg')
        with pytest.raises(dataclasses.FrozenInstanceError):
            email.value = 'autre@example.tg'


class TestPhoneNumber:
    def test_strips_whitespace(self):
        assert PhoneNumber('+228 90 00 00 00').value == '+22890000000'

    @pytest.mark.parametrize('invalid', ['22890000000', '+1234567', '+1234567890123456', '+228 90 AB 00 00'])
    def test_rejects_invalid_numbers(self, invalid):
        with pytest.raises(ValueError):
            PhoneNumber(invalid)

    @pytest.mark.parametrize('empty', [None, ''])
    def test_of_returns_none_without_number(self, empty):
        assert PhoneNumber.of(empty) is None

    def test_to_str(self):
        assert PhoneNumber.to_str(PhoneNumber('+22890000000')) == '+22890000000'
        assert PhoneNumber.to_str(None) is None


class TestPasswordHash:
    @pytest.mark.parametrize('empty', ['', '   '])
    def test_rejects_empty_value(self, empty):
        with pytest.raises(ValueError):
            PasswordHash(empty)
